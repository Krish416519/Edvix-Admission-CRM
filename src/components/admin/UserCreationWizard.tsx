import { useState, useEffect, useMemo } from 'react';
import {
  X, ChevronRight, ChevronLeft, Building2, Briefcase, UserCircle,
  Users, Shield, CheckCircle2, Eye, Save, AlertTriangle, Lock, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import {
  fetchDepartments, fetchDesignations, fetchTeams, fetchEligibleManagers,
  fetchAccessProfiles, fetchProfilePermissions, fetchAllPermissions,
  validateReportingHierarchy, logAuditEvent, getHasDedicatedAccessProfiles,
  type Department, type Designation, type Team, type AccessProfile, type Permission, type DataScope
} from '../../lib/orgApi';
import { adminCreateUser } from '../../lib/adminApi';

// ============================================================
// TYPES
// ============================================================

interface UserWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any; // existing user for editing
}

interface WizardState {
  // Step 1 — Basic Info
  name: string;
  email: string;
  phone: string;
  password: string;
  is_active: boolean;
  // Step 2 — Department
  department_id: string;
  // Step 3 — Designation
  designation_id: string;
  // Step 4 — Reporting
  manager_id: string;
  // Step 5 — Team
  team_id: string;
  // Step 6 — Access Profile
  access_profile_id: string;
  role_id: string;
}

const STEPS = [
  { id: 1, label: 'Basic Info', icon: UserCircle },
  { id: 2, label: 'Department', icon: Building2 },
  { id: 3, label: 'Designation', icon: Briefcase },
  { id: 4, label: 'Reporting', icon: ChevronRight },
  { id: 5, label: 'Team', icon: Users },
  { id: 6, label: 'Access Profile', icon: Shield },
  { id: 7, label: 'Access Summary', icon: Eye },
];

export function UserCreationWizard({ isOpen, onClose, onSuccess, initialData }: UserWizardProps) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>({
    name: '', email: '', phone: '', password: '', is_active: true,
    department_id: '', designation_id: '', manager_id: '', team_id: '',
    access_profile_id: '', role_id: '',
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [eligibleManagers, setEligibleManagers] = useState<any[]>([]);
  const [accessProfiles, setAccessProfiles] = useState<AccessProfile[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [profilePermIds, setProfilePermIds] = useState<string[]>([]);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setHierarchyError(null);

    if (initialData) {
      setState({
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        password: '',
        is_active: initialData.is_active ?? true,
        department_id: initialData.department_id || '',
        designation_id: initialData.designation_id || '',
        manager_id: initialData.manager_id || '',
        team_id: initialData.team_id || '',
        access_profile_id: initialData.access_profile_id || '',
        role_id: initialData.role_id || '',
      });
    } else {
      setState({
        name: '', email: '', phone: '', password: '', is_active: true,
        department_id: '', designation_id: '', manager_id: '', team_id: '',
        access_profile_id: '', role_id: '',
      });
    }

    // Load initial reference data
    Promise.all([
      fetchDepartments().catch(() => []),
      fetchAccessProfiles().catch(() => []),
      supabase.from('roles').select('id, name').order('name').then(r => r.data || []),
      fetchAllPermissions().catch(() => [])
    ]).then(([depts, profiles, roleData, perms]) => {
      setDepartments(depts.filter(d => d.status === 'Active'));
      setAccessProfiles(profiles);
      setRoles(roleData);
      setAllPermissions(perms);

      if (initialData) {
        setState(prev => {
          let resolvedProfileId = prev.access_profile_id;
          const isValidProfile = profiles.some(p => p.id === resolvedProfileId);
          if (!isValidProfile) {
            const roleName = initialData.role?.name || roleData.find(r => r.id === initialData.role_id)?.name;
            const desigName = initialData.designation?.name;
            const matchedProfile = profiles.find(p => 
              (roleName && p.name.toLowerCase() === roleName.toLowerCase()) ||
              (desigName && p.name.toLowerCase() === desigName.toLowerCase())
            );
            resolvedProfileId = matchedProfile?.id || '';
          }

          let resolvedRoleId = prev.role_id;
          const isValidRole = roleData.some(r => r.id === resolvedRoleId);
          if (!isValidRole) {
            const roleName = initialData.role?.name;
            const profObj = profiles.find(p => p.id === resolvedProfileId);
            const matchedRole = roleData.find(r => 
              (roleName && r.name.toLowerCase() === roleName.toLowerCase()) ||
              (profObj && r.name.toLowerCase() === profObj.name.toLowerCase())
            ) || roleData.find(r => r.name === 'Counselor') || roleData[0];
            resolvedRoleId = matchedRole?.id || '';
          }

          return {
            ...prev,
            access_profile_id: resolvedProfileId,
            role_id: resolvedRoleId
          };
        });
      }
    });
  }, [isOpen, initialData]);

  // When department changes, load its designations + teams
  useEffect(() => {
    if (!state.department_id) {
      setDesignations([]);
      setTeams([]);
      return;
    }
    Promise.all([
      fetchDesignations(state.department_id).catch(() => []),
      fetchTeams(state.department_id).catch(() => []),
    ]).then(([desigs, teamData]) => {
      setDesignations(desigs.filter(d => d.status === 'Active'));
      setTeams(teamData.filter(t => t.status === 'Active'));
    });
  }, [state.department_id]);

  // When designation changes, load eligible managers and pre-select default Access Profile
  useEffect(() => {
    if (!state.department_id || !state.designation_id) {
      setEligibleManagers([]);
      return;
    }
    const desig = designations.find(d => d.id === state.designation_id);
    if (!desig) return;

    // Pre-select default access profile if user hasn't manually customized
    if (!initialData || !state.access_profile_id) {
      if (desig.default_access_profile_id && accessProfiles.some(p => p.id === desig.default_access_profile_id)) {
        setState(prev => ({ ...prev, access_profile_id: desig.default_access_profile_id || '' }));
      } else {
        // Find matching profile by name
        const matchingProfile = accessProfiles.find(p => p.name.toLowerCase().includes(desig.name.toLowerCase()));
        if (matchingProfile) {
          setState(prev => ({ ...prev, access_profile_id: matchingProfile.id }));
        }
      }
    }

    // Fetch eligible managers with higher level in same department
    fetchEligibleManagers(state.department_id, desig.level)
      .then(managers => {
        // Exclude current user if editing
        const filtered = initialData ? managers.filter(m => m.id !== initialData.id) : managers;
        setEligibleManagers(filtered);
      })
      .catch(() => setEligibleManagers([]));
  }, [state.designation_id, state.department_id, designations, accessProfiles, initialData]);

  // Load permissions for selected access profile (or role fallback)
  useEffect(() => {
    const profileId = state.access_profile_id || state.role_id;
    if (profileId) {
      fetchProfilePermissions(profileId).then(setProfilePermIds).catch(() => setProfilePermIds([]));
    } else {
      setProfilePermIds([]);
    }
  }, [state.access_profile_id, state.role_id]);

  if (!isOpen) return null;

  const selectedDept = departments.find(d => d.id === state.department_id);
  const selectedDesig = designations.find(d => d.id === state.designation_id);
  const selectedManager = eligibleManagers.find(m => m.id === state.manager_id);
  const selectedTeam = teams.find(t => t.id === state.team_id);
  const selectedProfile = accessProfiles.find(p => p.id === state.access_profile_id) ||
    accessProfiles.find(p => {
      const userRole = roles.find(r => r.id === state.role_id);
      return userRole && p.name.toLowerCase() === userRole.name.toLowerCase();
    });

  // Group permissions for summary review
  const grantedPerms = allPermissions.filter(p => profilePermIds.includes(p.id));
  const permsByResource: Record<string, Permission[]> = {};
  grantedPerms.forEach(p => {
    if (!permsByResource[p.resource]) permsByResource[p.resource] = [];
    permsByResource[p.resource].push(p);
  });

  // Validation
  const validateCurrentStep = async (): Promise<boolean> => {
    if (step === 1) {
      if (!state.name.trim() || !state.email.trim()) {
        toast.error('Please enter name and valid email');
        return false;
      }
      if (!initialData && (!state.password || state.password.length < 6)) {
        toast.error('Password must be at least 6 characters');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!state.department_id && departments.length > 0) {
        toast.error('Please select a department');
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!state.designation_id && designations.length > 0) {
        toast.error('Please select a designation');
        return false;
      }
      return true;
    }
    if (step === 4) {
      if (state.manager_id) {
        const check = await validateReportingHierarchy(initialData?.id, state.manager_id);
        if (!check.valid) {
          setHierarchyError(check.reason || 'Invalid reporting relationship');
          toast.error(check.reason || 'Circular reporting detected');
          return false;
        }
      }
      setHierarchyError(null);
      return true;
    }
    if (step === 6) {
      if (!state.access_profile_id && !state.role_id && accessProfiles.length > 0) {
        toast.error('Please select an access profile');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = async () => {
    const ok = await validateCurrentStep();
    if (ok && step < 7) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // 1. Resolve role_id: Must be a valid ID from the `roles` table
      let validRoleId: string | null = null;
      if (state.role_id && roles.some(r => r.id === state.role_id)) {
        validRoleId = state.role_id;
      }
      
      const activeProfile = accessProfiles.find(p => p.id === state.access_profile_id) || selectedProfile;
      if (!validRoleId && activeProfile) {
        const matchingRole = roles.find(r => r.name.toLowerCase() === activeProfile.name.toLowerCase())
          || (activeProfile.name.toLowerCase().includes('admin') ? roles.find(r => r.name.includes('Admin')) : null)
          || roles.find(r => r.name === 'Counselor')
          || roles[0];
        if (matchingRole) {
          validRoleId = matchingRole.id;
        }
      }
      if (!validRoleId && roles.length > 0) {
        validRoleId = roles.find(r => r.name === 'Counselor')?.id || roles[0].id;
      }

      // 2. Resolve access_profile_id: Must be a valid ID from `accessProfiles` table
      let validProfileId: string | null = null;
      if (state.access_profile_id && accessProfiles.some(p => p.id === state.access_profile_id)) {
        validProfileId = state.access_profile_id;
      } else if (validRoleId) {
        const roleObj = roles.find(r => r.id === validRoleId);
        if (roleObj) {
          const matchingProf = accessProfiles.find(p => p.name.toLowerCase() === roleObj.name.toLowerCase());
          if (matchingProf) {
            validProfileId = matchingProf.id;
          }
        }
      }

      const userPayload: any = {
        name: state.name.trim(),
        phone: state.phone.trim() || null,
        department_id: state.department_id || null,
        designation_id: state.designation_id || null,
        team_id: state.team_id || null,
        manager_id: state.manager_id || null,
        role_id: validRoleId,
        is_active: state.is_active,
        updated_at: new Date().toISOString()
      };

      // Only attach access_profile_id if dedicated access profiles table is confirmed active in DB AND validProfileId is verified
      if (getHasDedicatedAccessProfiles() && validProfileId) {
        userPayload.access_profile_id = validProfileId;
      }

      const isProfileColOrFkError = (err: any) => {
        if (!err) return false;
        const msg = String(err.message || '').toLowerCase();
        const code = String(err.code || '');
        return (
          msg.includes('access_profile_id') ||
          msg.includes('users_access_profile_id_fkey') ||
          code === 'PGRST204' ||
          code === '23503'
        );
      };

      if (initialData) {
        // Update existing user with graceful fallback if schema cache or FK rejects access_profile_id
        let { error } = await supabase.from('users').update(userPayload).eq('id', initialData.id);
        if (error && userPayload.access_profile_id && isProfileColOrFkError(error)) {
          console.warn('access_profile_id update rejected, retrying without it:', error);
          delete userPayload.access_profile_id;
          const retry = await supabase.from('users').update(userPayload).eq('id', initialData.id);
          error = retry.error;
        }
        if (error) throw error;
        await logAuditEvent('USER_UPDATED', initialData.id, { new_state: userPayload });
        toast.success(`User ${state.name} updated successfully`);
      } else {
        // Create new user using the admin edge function to bypass public signup restrictions
        let userId: string | null = null;
        
        try {
          const adminRes = await adminCreateUser({
            email: state.email.trim(),
            password: state.password,
            name: state.name.trim(),
            role_id: validRoleId,
            role_name: activeProfile?.name || roles.find(r => r.id === validRoleId)?.name
          });
          userId = adminRes?.user?.id || null;
        } catch (adminErr: any) {
          console.warn('adminCreateUser error, attempting fallback:', adminErr);
          try {
            const { data: authData, error: authErr } = await supabase.auth.signUp({
              email: state.email.trim(),
              password: state.password,
              options: { data: { name: state.name.trim() } }
            });
            if (authErr && !authErr.message?.includes('already registered')) {
              throw new Error(adminErr.message || authErr.message);
            }
            userId = authData?.user?.id || null;
          } catch (fallbackErr: any) {
            if (fallbackErr.message?.includes('already registered')) {
              const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', state.email.trim())
                .maybeSingle();
              userId = existingUser?.id || null;
            } else {
              throw new Error(adminErr.message || fallbackErr.message);
            }
          }
        }

        // If not retrieved yet, check existing in public.users
        if (!userId) {
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', state.email.trim())
            .maybeSingle();
          userId = existingUser?.id || null;
        }

        if (userId) {
          userPayload.id = userId;
          userPayload.email = state.email.trim();
          let { error: profileError } = await supabase.from('users').upsert(userPayload);
          if (profileError && userPayload.access_profile_id && isProfileColOrFkError(profileError)) {
            console.warn('access_profile_id upsert rejected, retrying without it:', profileError);
            delete userPayload.access_profile_id;
            const retry = await supabase.from('users').upsert(userPayload);
            profileError = retry.error;
          }
          if (profileError) throw profileError;
        } else {
          userPayload.email = state.email.trim();
          let { error: insertError } = await supabase.from('users').insert([userPayload]);
          if (insertError && userPayload.access_profile_id && isProfileColOrFkError(insertError)) {
            console.warn('access_profile_id insert rejected, retrying without it:', insertError);
            delete userPayload.access_profile_id;
            const retry = await supabase.from('users').insert([userPayload]);
            insertError = retry.error;
          }
          if (insertError) throw insertError;
        }

        await logAuditEvent('USER_CREATED', userId || state.email, { new_state: userPayload });
        toast.success(`User ${state.name} created successfully`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('User save error:', err);
      toast.error(err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92dvh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
              <span className="truncate">{initialData ? `Edit User: ${initialData.name}` : 'Enterprise User Creation'}</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step {step} of 7: {STEPS[step - 1].label}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-6 py-3 border-b border-border bg-muted/10 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-1 min-w-[560px]">
            {STEPS.map((s, idx) => {
              const isCurrent = s.id === step;
              const isDone = s.id < step;
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div 
                    onClick={() => { if (isDone) setStep(s.id); }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-primary text-white shadow-sm'
                        : isDone
                        ? 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20'
                        : 'text-muted-foreground opacity-60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{s.label}</span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 mx-1 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* STEP 1: BASIC INFO */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-base text-foreground">Basic Information</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Enter contact credentials and account status.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={state.name}
                    onChange={e => setState({ ...state, name: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={!!initialData}
                    placeholder="rahul@edvix.in"
                    value={state.email}
                    onChange={e => setState({ ...state, email: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary transition-colors disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={state.phone}
                    onChange={e => setState({ ...state, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>

                {!initialData && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Initial Password *</label>
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={state.password}
                      onChange={e => setState({ ...state, password: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary transition-colors"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3">
                <label className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-xl cursor-pointer hover:bg-muted/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={state.is_active}
                    onChange={e => setState({ ...state, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-primary border-input focus:ring-primary"
                  />
                  <div>
                    <div className="text-sm font-medium text-foreground">Account Active</div>
                    <div className="text-xs text-muted-foreground">User can log in and access assigned CRM records</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: DEPARTMENT */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-base text-foreground">Select Department</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Where does this employee work in the organization?</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {departments.map(d => {
                  const isSelected = state.department_id === d.id;
                  return (
                    <div
                      key={d.id}
                      onClick={() => setState(prev => ({
                        ...prev,
                        department_id: d.id,
                        designation_id: '',
                        manager_id: '',
                        team_id: ''
                      }))}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                          : 'border-border bg-card hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground">{d.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">{d.code}</span>
                      </div>
                      {d.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: DESIGNATION */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-base text-foreground">
                  Select Designation in {selectedDept?.name || 'Department'}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Filtered strictly to roles in {selectedDept?.name}. Designations define business seniority.
                </p>
              </div>

              {designations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                  No active designations found for this department.
                </div>
              ) : (
                <div className="space-y-2.5 pt-2">
                  {designations.map(desig => {
                    const isSelected = state.designation_id === desig.id;
                    return (
                      <div
                        key={desig.id}
                        onClick={() => setState(prev => ({ ...prev, designation_id: desig.id, manager_id: '' }))}
                        className={`p-3.5 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                            : 'border-border bg-card hover:border-primary/40'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                            {desig.name}
                            <span className="text-xs px-2 py-0.2 rounded-full bg-muted text-muted-foreground">
                              Level {desig.level}
                            </span>
                          </div>
                          {desig.reports_to && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Standard reports to: <span className="font-medium text-foreground">{desig.reports_to.name}</span>
                            </div>
                          )}
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: REPORTING */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-base text-foreground">
                  Direct Reporting Manager
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Who does {state.name || 'this user'} directly report to? Only higher-level department staff are eligible.
                </p>
              </div>

              {hierarchyError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-500 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {hierarchyError}
                </div>
              )}

              <div className="space-y-2.5 pt-2">
                <div
                  onClick={() => setState(prev => ({ ...prev, manager_id: '' }))}
                  className={`p-3.5 border rounded-xl cursor-pointer transition-all ${
                    !state.manager_id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="font-semibold text-sm text-foreground">No Direct Manager (Top of Branch / Department Head)</div>
                  <div className="text-xs text-muted-foreground">Reports directly to executive governance</div>
                </div>

                {eligibleManagers.map(mgr => {
                  const isSelected = state.manager_id === mgr.id;
                  return (
                    <div
                      key={mgr.id}
                      onClick={() => setState(prev => ({ ...prev, manager_id: mgr.id }))}
                      className={`p-3.5 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                          : 'border-border bg-card hover:border-primary/40'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-sm text-foreground">{mgr.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {mgr.designation?.name || 'Manager'}
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: TEAM */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-base text-foreground">
                  Operational Team Assignment
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Which operational pod or team does this user belong to?
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <div
                  onClick={() => setState(prev => ({ ...prev, team_id: '' }))}
                  className={`p-3.5 border rounded-xl cursor-pointer transition-all ${
                    !state.team_id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="font-semibold text-sm text-foreground">No Team (Department-wide / Individual Contributor)</div>
                  <div className="text-xs text-muted-foreground">For admins, department heads, or cross-functional staff</div>
                </div>

                {teams.map(t => {
                  const isSelected = state.team_id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setState(prev => ({ ...prev, team_id: t.id }))}
                      className={`p-3.5 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                          : 'border-border bg-card hover:border-primary/40'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-sm text-foreground">{t.name}</div>
                        {t.team_leader && (
                          <div className="text-xs text-muted-foreground">
                            Team Leader: <span className="font-medium text-foreground">{t.team_leader.name}</span>
                          </div>
                        )}
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 6: ACCESS PROFILE */}
          {step === 6 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-base text-foreground">
                  Access Profile & Security Privilege
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Separated from designation. Defines technical capabilities and effective Data Scope.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-2">
                {accessProfiles.map(p => {
                  const isSelected = state.access_profile_id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        const matchingRole = roles.find(r => r.name.toLowerCase() === p.name.toLowerCase())
                          || roles.find(r => p.name.toLowerCase().includes(r.name.toLowerCase()))
                          || (p.name.toLowerCase().includes('admin') ? roles.find(r => r.name.includes('Admin')) : null)
                          || roles.find(r => r.name === 'Counselor')
                          || roles[0];
                        setState(prev => ({
                          ...prev,
                          access_profile_id: p.id,
                          role_id: matchingRole ? matchingRole.id : prev.role_id
                        }));
                      }}
                      className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                          : 'border-border bg-card hover:border-primary/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{p.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-500">
                            Scope: {p.data_scope}
                          </span>
                        </div>
                        {p.description && (
                          <p className="text-xs text-muted-foreground">{p.description}</p>
                        )}
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 7: ACCESS SUMMARY */}
          {step === 7 && (
            <div className="space-y-5">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">
                    User Access Safety Summary
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Verify all granted authorities before confirming. The backend authorization and database RLS will strictly enforce these access rules.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-2">
                  <div className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Employee Identity</div>
                  <div className="text-sm font-bold text-foreground">{state.name}</div>
                  <div className="text-muted-foreground">{state.email}</div>
                  {state.phone && <div className="text-muted-foreground">{state.phone}</div>}
                  <div className="pt-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                      state.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {state.is_active ? 'Active Account' : 'Inactive / Locked'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-2">
                  <div className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Organizational Placement</div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-medium text-foreground">{selectedDept?.name || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Designation:</span>
                    <span className="font-medium text-foreground">{selectedDesig?.name || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Team:</span>
                    <span className="font-medium text-foreground">{selectedTeam?.name || 'Department Wide'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reports To:</span>
                    <span className="font-medium text-foreground">{selectedManager?.name || 'Department Head / Executive'}</span>
                  </div>
                </div>
              </div>

              {/* Security Profile & Scopes */}
              <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div>
                    <div className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Access Profile</div>
                    <div className="text-sm font-bold text-primary">{selectedProfile?.name || 'Standard Access'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Effective Data Scope</div>
                    <div className="text-sm font-bold text-indigo-500">
                      {selectedProfile?.data_scope || 'ASSIGNED'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-foreground mb-2">Granted Permissions Breakdown:</div>
                  {Object.keys(permsByResource).length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">Standard baseline permissions applied</div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(permsByResource).map(([resource, perms]) => (
                        <div key={resource} className="text-xs">
                          <span className="font-medium text-muted-foreground">{resource}: </span>
                          <span className="text-foreground">
                            {perms.map(p => p.action).join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between shrink-0 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
          {step > 1 ? (
            <button
              onClick={handleBack}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors min-h-[44px]"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 7 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium bg-primary text-white hover:bg-primary-hover rounded-xl shadow-sm transition-colors min-h-[44px]"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-colors disabled:opacity-50 min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? (initialData ? 'Saving Changes...' : 'Creating User...') : initialData ? 'Save Changes' : 'Confirm & Create User'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
