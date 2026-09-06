import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield, Building2, Briefcase, Users, GitFork, UserCheck,
  History, Plus, Search, Check, AlertTriangle, ChevronRight,
  ChevronDown, Edit2, Archive, PowerOff, RefreshCw, Lock,
  FileSpreadsheet, Trash2, Eye, ShieldAlert, CheckCircle2,
  X, Filter, MoreVertical, Sparkles, UserPlus, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import {
  fetchDepartments, createDepartment, updateDepartment, deactivateDepartment, archiveDepartment, reactivateDepartment,
  fetchDesignations, createDesignation, updateDesignation, deactivateDesignation, archiveDesignation, reactivateDesignation,
  fetchTeams, createTeam, updateTeam, deactivateTeam,
  fetchAccessProfiles, createAccessProfile, updateAccessProfile,
  fetchProfilePermissions, saveProfilePermissions, fetchAllPermissions,
  fetchUsersWithOrgDetails, fetchAuditLogs, logAuditEvent,
  type Department, type Designation, type Team, type AccessProfile,
  type Permission, type UserWithOrgDetails, type AuditLog, type DataScope
} from '../../lib/orgApi';
import { UserCreationWizard } from './UserCreationWizard';
import { useAuth } from '../../contexts/AuthContext';

// High-Risk / Dangerous permissions that require explicit confirmation before granting
const DANGEROUS_PERMISSIONS = new Set([
  'Delete Leads',
  'Export Leads',
  'View All Leads',
  'Bulk Delete Leads',
  'Manage Users',
  'Manage Access Profiles',
  'Manage Permissions',
  'View Audit Logs',
  'Manage System Settings'
]);

type TabKey = 'overview' | 'departments' | 'designations' | 'hierarchy' | 'teams' | 'profiles' | 'users' | 'audit';

export function RoleManagement() {
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('profiles');

  // Core Data States
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [accessProfiles, setAccessProfiles] = useState<AccessProfile[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<UserWithOrgDetails[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Editor States
  const [selectedProfile, setSelectedProfile] = useState<AccessProfile | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [profileDataScope, setProfileDataScope] = useState<DataScope>('ASSIGNED');
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permSearch, setPermSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Dangerous Permission Confirmation Dialog State
  const [pendingDangerousPerm, setPendingDangerousPerm] = useState<{ id: string; action: string; resource: string } | null>(null);

  // Modals
  const [isUserWizardOpen, setIsUserWizardOpen] = useState(false);
  const [wizardEditUser, setWizardEditUser] = useState<any>(null);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });

  const [showDesigModal, setShowDesigModal] = useState(false);
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null);
  const [desigForm, setDesigForm] = useState({ department_id: '', name: '', level: 10, reports_to_designation_id: '' });

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState({ department_id: '', name: '', team_leader_id: '' });

  const [showNewProfileModal, setShowNewProfileModal] = useState(false);
  const [newProfileForm, setNewProfileForm] = useState({ name: '', department_id: '', description: '', data_scope: 'ASSIGNED' as DataScope });

  // Custom User Overrides Modal
  const [overrideUser, setOverrideUser] = useState<UserWithOrgDetails | null>(null);
  const [userOverrides, setUserOverrides] = useState<any[]>([]);
  const [savingOverrides, setSavingOverrides] = useState(false);

  // Load All Core Data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [depts, desigs, tms, profs, perms, usrs, logs] = await Promise.all([
        fetchDepartments().catch(() => []),
        fetchDesignations().catch(() => []),
        fetchTeams().catch(() => []),
        fetchAccessProfiles().catch(() => []),
        fetchAllPermissions().catch(() => []),
        fetchUsersWithOrgDetails().catch(() => []),
        fetchAuditLogs(50).catch(() => [])
      ]);

      setDepartments(depts);
      setDesignations(desigs);
      setTeams(tms);
      setAccessProfiles(profs);
      setPermissions(perms);
      setUsers(usrs);
      setAuditLogs(logs);

      // Default select first profile if none selected
      if (profs.length > 0) {
        const initial = profs.find(p => p.name === 'Admissions Counselor - Standard') ||
          profs.find(p => p.name.includes('Counselor')) || profs[0];
        handleSelectProfile(initial);
      }
    } catch (err: any) {
      console.error('Failed to load enterprise RBAC data:', err);
      toast.error('Failed to load organization & access control data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Profile Selection Handler
  const handleSelectProfile = async (profile: AccessProfile) => {
    setSelectedProfile(profile);
    setProfileDataScope(profile.data_scope);
    try {
      const pIds = await fetchProfilePermissions(profile.id);
      setSelectedPermIds(new Set(pIds));
    } catch (e) {
      setSelectedPermIds(new Set());
    }
  };

  // Toggle permission selection with danger guard
  const handleTogglePermission = (perm: Permission) => {
    const isCurrentlyChecked = selectedPermIds.has(perm.id);

    // If granting a dangerous permission, show confirmation modal
    if (!isCurrentlyChecked && DANGEROUS_PERMISSIONS.has(perm.action)) {
      setPendingDangerousPerm(perm);
      return;
    }

    const next = new Set(selectedPermIds);
    if (isCurrentlyChecked) next.delete(perm.id);
    else next.add(perm.id);
    setSelectedPermIds(next);
  };

  const confirmDangerousPermission = () => {
    if (!pendingDangerousPerm) return;
    const next = new Set(selectedPermIds);
    next.add(pendingDangerousPerm.id);
    setSelectedPermIds(next);
    setPendingDangerousPerm(null);
    toast.warning(`Granted elevated privilege: ${pendingDangerousPerm.action}`);
  };

  // Save permissions & scope for profile
  const handleSaveProfileAccess = async () => {
    if (!selectedProfile) return;
    setSavingPermissions(true);
    try {
      // 1. Update data scope if changed
      if (profileDataScope !== selectedProfile.data_scope) {
        await updateAccessProfile(selectedProfile.id, { data_scope: profileDataScope });
        selectedProfile.data_scope = profileDataScope;
      }

      // 2. Update permissions
      await saveProfilePermissions(selectedProfile.id, Array.from(selectedPermIds));

      toast.success(`Access configuration for "${selectedProfile.name}" saved successfully`);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save access profile');
    } finally {
      setSavingPermissions(false);
    }
  };

  // Group permissions by resource
  const groupedPermissions = useMemo(() => {
    const map: Record<string, Permission[]> = {};
    const filterLower = permSearch.toLowerCase().trim();

    permissions.forEach(p => {
      if (filterLower) {
        const matchesAction = p.action.toLowerCase().includes(filterLower);
        const matchesResource = p.resource.toLowerCase().includes(filterLower);
        const matchesDesc = p.description?.toLowerCase().includes(filterLower);
        if (!matchesAction && !matchesResource && !matchesDesc) return;
      }
      if (!map[p.resource]) map[p.resource] = [];
      map[p.resource].push(p);
    });

    return map;
  }, [permissions, permSearch]);

  const toggleGroupCollapse = (resource: string) => {
    const next = new Set(collapsedGroups);
    if (next.has(resource)) next.delete(resource);
    else next.add(resource);
    setCollapsedGroups(next);
  };

  // -------------------------------------------------------------
  // DEPARTMENT CRUD HANDLERS
  // -------------------------------------------------------------
  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orgId = departments[0]?.organization_id || 'ac839210-a02f-4754-80ac-77b90919e938';
      if (editingDept) {
        await updateDepartment(editingDept.id, deptForm);
        toast.success(`Department "${deptForm.name}" updated`);
      } else {
        await createDepartment({ ...deptForm, organization_id: orgId });
        toast.success(`Department "${deptForm.name}" created`);
      }
      setShowDeptModal(false);
      setEditingDept(null);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save department');
    }
  };

  // -------------------------------------------------------------
  // DESIGNATION CRUD HANDLERS
  // -------------------------------------------------------------
  const handleSaveDesig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDesig) {
        await updateDesignation(editingDesig.id, desigForm);
        toast.success(`Designation "${desigForm.name}" updated`);
      } else {
        await createDesignation({
          department_id: desigForm.department_id,
          name: desigForm.name,
          level: Number(desigForm.level),
          reports_to_designation_id: desigForm.reports_to_designation_id || null
        });
        toast.success(`Designation "${desigForm.name}" created`);
      }
      setShowDesigModal(false);
      setEditingDesig(null);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save designation');
    }
  };

  // -------------------------------------------------------------
  // TEAM CRUD HANDLERS
  // -------------------------------------------------------------
  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTeam) {
        await updateTeam(editingTeam.id, teamForm);
        toast.success(`Team "${teamForm.name}" updated`);
      } else {
        await createTeam({
          department_id: teamForm.department_id,
          name: teamForm.name,
          team_leader_id: teamForm.team_leader_id || null
        });
        toast.success(`Team "${teamForm.name}" created`);
      }
      setShowTeamModal(false);
      setEditingTeam(null);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save team');
    }
  };

  // -------------------------------------------------------------
  // NEW ACCESS PROFILE HANDLER
  // -------------------------------------------------------------
  const handleCreateNewProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orgId = departments[0]?.organization_id || 'ac839210-a02f-4754-80ac-77b90919e938';
      const created = await createAccessProfile({
        name: newProfileForm.name,
        department_id: newProfileForm.department_id || null,
        description: newProfileForm.description,
        data_scope: newProfileForm.data_scope,
        organization_id: orgId
      });
      toast.success(`Access Profile "${newProfileForm.name}" created`);
      setShowNewProfileModal(false);
      setNewProfileForm({ name: '', department_id: '', description: '', data_scope: 'ASSIGNED' });
      await loadAllData();
      handleSelectProfile(created);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create access profile');
    }
  };

  // -------------------------------------------------------------
  // USER CUSTOM OVERRIDES HANDLER
  // -------------------------------------------------------------
  const openUserOverrides = async (u: UserWithOrgDetails) => {
    setOverrideUser(u);
    try {
      const { data } = await supabase
        .from('user_permission_overrides')
        .select('*, permission:permissions(*)')
        .eq('user_id', u.id);
      setUserOverrides(data || []);
    } catch (e) {
      setUserOverrides([]);
    }
  };

  const handleToggleUserOverride = async (permId: string, currentDeny?: boolean) => {
    if (!overrideUser) return;
    setSavingOverrides(true);
    try {
      if (currentDeny === undefined) {
        // Create an explicit GRANT override
        await supabase.from('user_permission_overrides').upsert([{
          user_id: overrideUser.id,
          permission_id: permId,
          is_deny: false
        }]);
        toast.success('Custom permission override granted');
      } else if (currentDeny === false) {
        // Toggle to explicit DENY override
        await supabase.from('user_permission_overrides').upsert([{
          user_id: overrideUser.id,
          permission_id: permId,
          is_deny: true
        }]);
        toast.warning('Custom permission override set to DENY');
      } else {
        // Remove override back to inherited
        await supabase.from('user_permission_overrides').delete()
          .eq('user_id', overrideUser.id)
          .eq('permission_id', permId);
        toast.info('Override removed. Reverted to inherited profile permission.');
      }
      openUserOverrides(overrideUser);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update override');
    } finally {
      setSavingOverrides(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Loading enterprise RBAC & organization system...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20">
        <div>
          <div className="flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-primary" />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Roles & Access Governance
            </h2>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-2xl">
            Enterprise multi-department organizational hierarchy, designation levels, operational teams, and backend-enforced RBAC data scopes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setWizardEditUser(null);
              setIsUserWizardOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs md:text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add New User
          </button>
          <button
            onClick={() => {
              setEditingDept(null);
              setDeptForm({ name: '', code: '', description: '' });
              setShowDeptModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-secondary text-secondary-foreground rounded-xl text-xs md:text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Department
          </button>
          <button
            onClick={loadAllData}
            title="Refresh System State"
            className="p-2 border border-border bg-card rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-card border border-border rounded-xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Departments</div>
          <div className="text-xl font-bold text-foreground mt-1">{departments.length}</div>
          <div className="text-[10px] text-emerald-500 font-medium mt-0.5">{departments.filter(d => d.status === 'Active').length} Active</div>
        </div>
        <div className="p-3.5 bg-card border border-border rounded-xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Designations</div>
          <div className="text-xl font-bold text-foreground mt-1">{designations.length}</div>
          <div className="text-[10px] text-indigo-500 font-medium mt-0.5">Hierarchy Levels</div>
        </div>
        <div className="p-3.5 bg-card border border-border rounded-xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Teams</div>
          <div className="text-xl font-bold text-foreground mt-1">{teams.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Operational Pods</div>
        </div>
        <div className="p-3.5 bg-card border border-border rounded-xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Access Profiles</div>
          <div className="text-xl font-bold text-primary mt-1">{accessProfiles.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Security Profiles</div>
        </div>
        <div className="p-3.5 bg-card border border-border rounded-xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Users</div>
          <div className="text-xl font-bold text-foreground mt-1">{users.length}</div>
          <div className="text-[10px] text-emerald-500 font-medium mt-0.5">{users.filter(u => u.is_active).length} Active</div>
        </div>
        <div className="p-3.5 bg-card border border-border rounded-xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Permissions</div>
          <div className="text-xl font-bold text-foreground mt-1">{permissions.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">7 System Modules</div>
        </div>
      </div>

      {/* Navigation Tabs Header */}
      <div className="flex border-b border-border overflow-x-auto hide-scrollbar bg-card/50 rounded-t-xl px-2">
        {[
          { id: 'profiles', label: 'Access Profiles', icon: Shield },
          { id: 'departments', label: 'Departments', icon: Building2 },
          { id: 'designations', label: 'Designations', icon: Briefcase },
          { id: 'hierarchy', label: 'Reporting Structure', icon: GitFork },
          { id: 'teams', label: 'Teams', icon: Users },
          { id: 'users', label: 'Users & Overrides', icon: UserCheck },
          { id: 'audit', label: 'Audit Logs', icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabKey)}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs md:text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ACCESS PROFILES (Main Security & Permission Panel) */}
      {/* ========================================================= */}
      {activeTab === 'profiles' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Profile Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Security Profiles ({accessProfiles.length})
              </h3>
              <button
                onClick={() => setShowNewProfileModal(true)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                New Profile
              </button>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {accessProfiles.map((profile) => {
                const isSelected = selectedProfile?.id === profile.id;
                const isSuper = profile.name === 'Super Admin';
                return (
                  <div
                    key={profile.id}
                    onClick={() => handleSelectProfile(profile)}
                    className={`p-3.5 border rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {profile.name}
                      </h4>
                      {isSuper && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-500">
                        Scope: {profile.data_scope}
                      </span>
                      {profile.status === 'Archived' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">Archived</span>
                      )}
                    </div>
                    {profile.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {profile.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Profile Permission Editor */}
          <div className="lg:col-span-3">
            {selectedProfile ? (
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
                
                {/* Editor Header */}
                <div className="p-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground">
                        Configure Profile: <span className="text-primary">{selectedProfile.name}</span>
                      </h3>
                      {selectedProfile.name === 'Super Admin' && (
                        <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full font-medium">
                          Global System Bypass
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Define effective data scopes and granular module privileges enforced at database RLS level.
                    </p>
                  </div>

                  <button
                    onClick={handleSaveProfileAccess}
                    disabled={savingPermissions || selectedProfile.name === 'Super Admin'}
                    className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover shadow-sm disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {savingPermissions ? 'Saving...' : 'Save Access Rules'}
                  </button>
                </div>

                {/* Data Scope Selector */}
                <div className="p-5 border-b border-border bg-card">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-primary" />
                        Effective Data Scope
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Controls which records this profile is authorized to query from the database.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={profileDataScope}
                        disabled={selectedProfile.name === 'Super Admin'}
                        onChange={e => setProfileDataScope(e.target.value as DataScope)}
                        className="px-3 py-1.5 bg-background border border-border rounded-xl text-xs font-semibold text-primary outline-none focus:border-primary transition-colors disabled:opacity-60"
                      >
                        <option value="OWN">OWN — Only personally authored records</option>
                        <option value="ASSIGNED">ASSIGNED — Only directly assigned leads & tasks</option>
                        <option value="TEAM">TEAM — Full visibility over operational team</option>
                        <option value="DEPARTMENT">DEPARTMENT — Entire departmental pipeline</option>
                        <option value="ORGANIZATION">ORGANIZATION — Global company-wide scope</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Permission Search Bar */}
                <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-3">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search permissions by action, resource, or description..."
                    value={permSearch}
                    onChange={e => setPermSearch(e.target.value)}
                    className="w-full bg-transparent border-none text-xs outline-none placeholder:text-muted-foreground"
                  />
                  {permSearch && (
                    <button onClick={() => setPermSearch('')} className="text-xs text-muted-foreground hover:text-foreground">
                      Clear
                    </button>
                  )}
                </div>

                {/* Categorized Permission Groups */}
                <div className="p-6 space-y-6 max-h-[620px] overflow-y-auto custom-scrollbar">
                  {Object.keys(groupedPermissions).length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground">
                      No permissions match your search query.
                    </div>
                  ) : (
                    Object.entries(groupedPermissions).map(([resource, perms]) => {
                      const isCollapsed = collapsedGroups.has(resource);
                      const groupCheckedCount = perms.filter(p => selectedPermIds.has(p.id) || selectedProfile.name === 'Super Admin').length;

                      return (
                        <div key={resource} className="border border-border rounded-xl overflow-hidden bg-card">
                          
                          {/* Group Header */}
                          <div
                            onClick={() => toggleGroupCollapse(resource)}
                            className="p-3.5 bg-muted/20 border-b border-border flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {isCollapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                              <span className="font-semibold text-sm text-foreground">{resource}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                {groupCheckedCount}/{perms.length} active
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">Click to toggle</span>
                          </div>

                          {/* Group Items */}
                          {!isCollapsed && (
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {perms.map(perm => {
                                const isSuper = selectedProfile.name === 'Super Admin';
                                const isChecked = selectedPermIds.has(perm.id) || isSuper;
                                const isDangerous = DANGEROUS_PERMISSIONS.has(perm.action);

                                return (
                                  <label
                                    key={perm.id}
                                    onClick={(e) => {
                                      if (isSuper) return;
                                      e.preventDefault();
                                      handleTogglePermission(perm);
                                    }}
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                      isChecked
                                        ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                                        : 'border-border bg-card hover:border-border hover:bg-muted/20'
                                    } ${isSuper ? 'cursor-not-allowed opacity-85' : ''}`}
                                  >
                                    <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all ${
                                      isChecked ? 'bg-primary border-primary text-white' : 'border-input bg-background'
                                    }`}>
                                      {isChecked && <Check className="w-3 h-3" />}
                                    </div>

                                    <div className="flex flex-col flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-semibold text-foreground truncate">
                                          {perm.action}
                                        </span>
                                        {isDangerous && (
                                          <span title="High-Risk Permission" className="inline-flex items-center">
                                            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                          </span>
                                        )}
                                      </div>
                                      {perm.description && (
                                        <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                                          {perm.description}
                                        </span>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                Select an access profile from the list to view and configure its permissions.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: DEPARTMENTS */}
      {/* ========================================================= */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base text-foreground">Operational Departments</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Organizational units governing distinct pipelines, staff designations, and data boundaries.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingDept(null);
                setDeptForm({ name: '', code: '', description: '' });
                setShowDeptModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-hover shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Department
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {departments.map((dept) => {
              const deptDesigs = designations.filter(d => d.department_id === dept.id);
              const deptTeams = teams.filter(t => t.department_id === dept.id);
              const deptUsers = users.filter(u => u.department_id === dept.id);

              return (
                <div key={dept.id} className="p-5 bg-card border border-border rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-foreground">{dept.name}</h4>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                            {dept.code}
                          </span>
                        </div>
                        {dept.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {dept.description}
                          </p>
                        )}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        dept.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' :
                        dept.status === 'Inactive' ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'
                      }`}>
                        {dept.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                      <div className="p-2 bg-muted/20 border border-border rounded-xl">
                        <div className="text-xs font-bold text-foreground">{deptDesigs.length}</div>
                        <div className="text-[10px] text-muted-foreground">Designations</div>
                      </div>
                      <div className="p-2 bg-muted/20 border border-border rounded-xl">
                        <div className="text-xs font-bold text-foreground">{deptTeams.length}</div>
                        <div className="text-[10px] text-muted-foreground">Teams</div>
                      </div>
                      <div className="p-2 bg-muted/20 border border-border rounded-xl">
                        <div className="text-xs font-bold text-foreground">{deptUsers.length}</div>
                        <div className="text-[10px] text-muted-foreground">Staff</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        setEditingDept(dept);
                        setDeptForm({ name: dept.name, code: dept.code, description: dept.description || '' });
                        setShowDeptModal(true);
                      }}
                      className="text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Details
                    </button>

                    <div className="flex items-center gap-2">
                      {dept.status === 'Active' ? (
                        <button
                          onClick={async () => {
                            try {
                              await deactivateDepartment(dept.id);
                              toast.info(`Department ${dept.name} deactivated`);
                              loadAllData();
                            } catch (e: any) {
                              toast.error(e.message);
                            }
                          }}
                          className="text-amber-500 hover:text-amber-600 font-medium"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            await reactivateDepartment(dept.id);
                            toast.success(`Department ${dept.name} reactivated`);
                            loadAllData();
                          }}
                          className="text-emerald-500 hover:text-emerald-600 font-medium"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: DESIGNATIONS */}
      {/* ========================================================= */}
      {activeTab === 'designations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base text-foreground">Designations & Job Titles</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Department-specific titles defining organizational authority level and default security profiles.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingDesig(null);
                setDesigForm({ department_id: departments[0]?.id || '', name: '', level: 10, reports_to_designation_id: '' });
                setShowDesigModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-hover shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Designation
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Designation</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Hierarchy Level</th>
                  <th className="p-3.5">Standard Reports To</th>
                  <th className="p-3.5">Active Users</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {designations.map((desig) => {
                  const dept = departments.find(d => d.id === desig.department_id);
                  const desigUsers = users.filter(u => u.designation_id === desig.id);

                  return (
                    <tr key={desig.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3.5 font-semibold text-foreground">{desig.name}</td>
                      <td className="p-3.5 text-muted-foreground">{dept?.name || 'Unassigned'}</td>
                      <td className="p-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-[11px]">
                          Level {desig.level}
                        </span>
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        {desig.reports_to?.name || <span className="italic text-muted-foreground/60">None (Branch Root)</span>}
                      </td>
                      <td className="p-3.5 font-medium text-foreground">{desigUsers.length} staff</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          desig.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                        }`}>
                          {desig.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setEditingDesig(desig);
                            setDesigForm({
                              department_id: desig.department_id,
                              name: desig.name,
                              level: desig.level,
                              reports_to_designation_id: desig.reports_to_designation_id || ''
                            });
                            setShowDesigModal(true);
                          }}
                          className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: REPORTING HIERARCHY */}
      {/* ========================================================= */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-base text-foreground">Organizational Hierarchy Tree</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visual top-down supervisory chain. Cycle detection prevents invalid circular reporting relationships.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => {
              const deptDesigs = designations
                .filter(d => d.department_id === dept.id)
                .sort((a, b) => b.level - a.level);

              return (
                <div key={dept.id} className="p-5 bg-card border border-border rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <h4 className="font-bold text-sm text-foreground">{dept.name}</h4>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      {dept.code}
                    </span>
                  </div>

                  <div className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                    {deptDesigs.map((desig, idx) => {
                      const staffCount = users.filter(u => u.designation_id === desig.id).length;
                      return (
                        <div key={desig.id} className="relative flex items-start gap-3 pl-7">
                          <div className="absolute left-2.5 top-2 w-2 h-2 rounded-full bg-primary ring-4 ring-card" />
                          <div className="p-3 bg-muted/20 border border-border rounded-xl flex-1 hover:border-primary/30 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-foreground">{desig.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary font-semibold rounded">
                                L{desig.level}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
                              <span>Staff: {staffCount}</span>
                              {desig.reports_to && (
                                <span className="text-[10px] text-muted-foreground/80">↳ {desig.reports_to.name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: TEAMS */}
      {/* ========================================================= */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base text-foreground">Operational Teams</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Frontline operational pods (e.g. Team Alpha, Beta, Gamma) determining team-level lead visibility.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTeam(null);
                setTeamForm({ department_id: departments[0]?.id || '', name: '', team_leader_id: '' });
                setShowTeamModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-hover shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Team
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {teams.map((t) => {
              const dept = departments.find(d => d.id === t.department_id);
              const members = users.filter(u => u.team_id === t.id);

              return (
                <div key={t.id} className="p-5 bg-card border border-border rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-base text-foreground">{t.name}</h4>
                        <span className="text-xs text-muted-foreground">{dept?.name || 'Department'}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-500">
                        {t.status}
                      </span>
                    </div>

                    <div className="p-3 bg-muted/20 border border-border rounded-xl text-xs space-y-1">
                      <div className="text-muted-foreground">Team Leader:</div>
                      <div className="font-semibold text-foreground">
                        {t.team_leader?.name || <span className="italic text-muted-foreground">None assigned</span>}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-1.5">
                        Active Members ({members.length}):
                      </div>
                      {members.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic">No members assigned yet</div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {members.map(m => (
                            <span key={m.id} className="text-[11px] px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md font-medium">
                              {m.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-between items-center text-xs">
                    <button
                      onClick={() => {
                        setEditingTeam(t);
                        setTeamForm({ department_id: t.department_id, name: t.name, team_leader_id: t.team_leader_id || '' });
                        setShowTeamModal(true);
                      }}
                      className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Team
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          await deactivateTeam(t.id);
                          toast.info(`Team ${t.name} deactivated`);
                          loadAllData();
                        } catch (e: any) {
                          toast.error(e.message);
                        }
                      }}
                      className="text-amber-500 hover:text-amber-600 font-medium"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: USERS & PERMISSION OVERRIDES */}
      {/* ========================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base text-foreground">User Directory & Privilege Overrides</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Staff records with resolved designations, operational pods, reporting managers, and custom permission overrides.
              </p>
            </div>
            <button
              onClick={() => {
                setWizardEditUser(null);
                setIsUserWizardOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-hover shadow-sm transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add User
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Employee</th>
                  <th className="p-3.5">Designation</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Team</th>
                  <th className="p-3.5">Reports To</th>
                  <th className="p-3.5">Access Profile</th>
                  <th className="p-3.5">Data Scope</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-foreground">{u.name}</div>
                      <div className="text-[11px] text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="p-3.5 font-medium text-foreground">
                      {u.designation?.name || <span className="italic text-muted-foreground">Unassigned</span>}
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {u.department?.name || <span className="italic text-muted-foreground">Unassigned</span>}
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {u.team?.name || <span className="italic text-muted-foreground/60">None</span>}
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {u.manager?.name || <span className="italic text-muted-foreground/60">Executive</span>}
                    </td>
                    <td className="p-3.5 font-medium text-primary">
                      {u.access_profile?.name || u.role?.name || 'Standard'}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-indigo-500/10 text-indigo-500">
                        {u.effective_scope}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        u.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {u.is_active ? 'Active' : 'Locked'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openUserOverrides(u)}
                          className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-[11px] font-semibold hover:bg-secondary/80"
                        >
                          Overrides
                        </button>
                        <button
                          onClick={() => {
                            setWizardEditUser(u);
                            setIsUserWizardOpen(true);
                          }}
                          className="text-primary hover:underline font-medium text-[11px]"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: AUDIT LOGS */}
      {/* ========================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-base text-foreground">Immutable RBAC & Change Audit Logs</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Chronological security log tracking role creations, permission modifications, data scope changes, and staff lifecycle events.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Actor</th>
                  <th className="p-3.5">Target</th>
                  <th className="p-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                      No security audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-primary">{log.action}</span>
                      </td>
                      <td className="p-3.5 text-foreground">
                        {log.actor?.name || log.actor?.email || 'System'}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                        {log.target_id || '-'}
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        {log.new_state ? JSON.stringify(log.new_state).substring(0, 80) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DANGEROUS PERMISSION CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {pendingDangerousPerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-red-500/30 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-lg text-foreground">High-Risk Privilege Warning</h3>
              <p className="text-xs text-muted-foreground">
                You are granting the high-risk permission:
              </p>
              <div className="py-2">
                <span className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 font-bold text-sm rounded-lg">
                  {pendingDangerousPerm.action}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Profile: <strong className="text-foreground">{selectedProfile?.name}</strong> • Scope: <strong className="text-foreground">{profileDataScope}</strong>
                <br />
                This will grant this access profile technical authority to perform this dangerous operation on protected CRM data.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setPendingDangerousPerm(null)}
                className="flex-1 px-4 py-2 border border-border text-sm font-medium rounded-xl hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDangerousPermission}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl shadow-md transition-colors"
              >
                Confirm Grant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* USER OVERRIDES MODAL */}
      {/* ========================================================= */}
      {overrideUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div>
                <h3 className="font-bold text-base text-foreground">
                  Custom Permission Overrides: {overrideUser.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Base Profile: <strong className="text-primary">{overrideUser.access_profile?.name || overrideUser.role?.name}</strong> • Scope: {overrideUser.effective_scope}
                </p>
              </div>
              <button onClick={() => setOverrideUser(null)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                You can override specific permissions for this individual user without changing their designation or base access profile.
              </p>

              <div className="space-y-2">
                {permissions.slice(0, 15).map(p => {
                  const override = userOverrides.find(o => o.permission_id === p.id);
                  const isExplicitGrant = override && override.is_deny === false;
                  const isExplicitDeny = override && override.is_deny === true;

                  return (
                    <div key={p.id} className="p-3 border border-border rounded-xl flex items-center justify-between bg-card text-xs">
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          {p.action}
                          <span className="text-[10px] text-muted-foreground font-normal">({p.resource})</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Status: {
                            isExplicitGrant ? <span className="text-emerald-500 font-bold">Explicit ALLOW Override</span> :
                            isExplicitDeny ? <span className="text-red-500 font-bold">Explicit DENY Override</span> :
                            <span className="text-muted-foreground">Inherited from Profile</span>
                          }
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleUserOverride(p.id, override ? override.is_deny : undefined)}
                          className="px-2.5 py-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg font-medium"
                        >
                          {isExplicitGrant ? 'Set DENY' : isExplicitDeny ? 'Remove Override' : 'Override ALLOW'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
              <button
                onClick={() => setOverrideUser(null)}
                className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-hover"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DEPARTMENT MODAL */}
      {/* ========================================================= */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground">
                {editingDept ? 'Edit Department' : 'Create New Department'}
              </h3>
              <button onClick={() => setShowDeptModal(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Finance"
                  value={deptForm.name}
                  onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Department Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FIN"
                  value={deptForm.code}
                  onChange={e => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm font-mono outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  rows={3}
                  placeholder="Department operational purpose..."
                  value={deptForm.description}
                  onChange={e => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 border border-border rounded-xl text-xs font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-hover shadow-sm"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DESIGNATION MODAL */}
      {/* ========================================================= */}
      {showDesigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground">
                {editingDesig ? 'Edit Designation' : 'Create New Designation'}
              </h3>
              <button onClick={() => setShowDesigModal(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDesig} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Department *</label>
                <select
                  required
                  value={desigForm.department_id}
                  onChange={e => setDesigForm({ ...desigForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Designation Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Academic Counselor"
                  value={desigForm.name}
                  onChange={e => setDesigForm({ ...desigForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Hierarchy Level (0 - 100) *</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={desigForm.level}
                  onChange={e => setDesigForm({ ...desigForm, level: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary"
                />
                <p className="text-[11px] text-muted-foreground">Higher number denotes higher seniority (e.g. 100 for Admin, 80 for Manager, 50 for TL, 10 for Counselor).</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Standard Reports To Designation</label>
                <select
                  value={desigForm.reports_to_designation_id}
                  onChange={e => setDesigForm({ ...desigForm, reports_to_designation_id: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary"
                >
                  <option value="">None (Top of branch)</option>
                  {designations
                    .filter(d => d.department_id === desigForm.department_id && (!editingDesig || d.id !== editingDesig.id))
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.name} (L{d.level})</option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowDesigModal(false)}
                  className="px-4 py-2 border border-border rounded-xl text-xs font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-hover shadow-sm"
                >
                  Save Designation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TEAM MODAL */}
      {/* ========================================================= */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground">
                {editingTeam ? 'Edit Team' : 'Create New Team'}
              </h3>
              <button onClick={() => setShowTeamModal(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Department *</label>
                <select
                  required
                  value={teamForm.department_id}
                  onChange={e => setTeamForm({ ...teamForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Team Delta"
                  value={teamForm.name}
                  onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Team Leader</label>
                <select
                  value={teamForm.team_leader_id}
                  onChange={e => setTeamForm({ ...teamForm, team_leader_id: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary"
                >
                  <option value="">None assigned</option>
                  {users
                    .filter(u => u.department_id === teamForm.department_id)
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.designation?.name || 'Staff'})</option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="px-4 py-2 border border-border rounded-xl text-xs font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-hover shadow-sm"
                >
                  Save Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* NEW ACCESS PROFILE MODAL */}
      {/* ========================================================= */}
      {showNewProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground">Create Custom Access Profile</h3>
              <button onClick={() => setShowNewProfileModal(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Profile Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Admissions Specialist"
                  value={newProfileForm.name}
                  onChange={e => setNewProfileForm({ ...newProfileForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Default Data Scope *</label>
                <select
                  value={newProfileForm.data_scope}
                  onChange={e => setNewProfileForm({ ...newProfileForm, data_scope: e.target.value as DataScope })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary"
                >
                  <option value="ASSIGNED">ASSIGNED (Only directly assigned records)</option>
                  <option value="TEAM">TEAM (Full visibility over team records)</option>
                  <option value="DEPARTMENT">DEPARTMENT (Full departmental records)</option>
                  <option value="ORGANIZATION">ORGANIZATION (Organization wide)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe technical permissions and responsibilities..."
                  value={newProfileForm.description}
                  onChange={e => setNewProfileForm({ ...newProfileForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowNewProfileModal(false)}
                  className="px-4 py-2 border border-border rounded-xl text-xs font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-hover shadow-sm"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER CREATION / EDIT WIZARD */}
      <UserCreationWizard
        isOpen={isUserWizardOpen}
        onClose={() => {
          setIsUserWizardOpen(false);
          setWizardEditUser(null);
        }}
        onSuccess={loadAllData}
        initialData={wizardEditUser}
      />

    </div>
  );
}
