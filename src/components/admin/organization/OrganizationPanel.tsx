import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Users, Briefcase, ChevronRight, Plus, Edit2,
  PowerOff, RefreshCw, Shield, Star, TrendingUp, UserCircle,
  FolderTree, AlertCircle, CheckCircle2, MoreVertical, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import {
  fetchOrgOverview, fetchDepartments, fetchDesignations, fetchTeams,
  createDepartment, updateDepartment, deactivateDepartment,
  createDesignation, updateDesignation, deactivateDesignation,
  createTeam, updateTeam, deactivateTeam,
  type Department, type Designation, type Team, type OrgOverview
} from '../../../lib/orgApi';
import { supabase } from '../../../lib/supabase';

// ============================================================
// MAIN COMPONENT
// ============================================================

type View = 'overview' | 'department';

export function OrganizationPanel() {
  const [view, setView] = useState<View>('overview');
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [overview, setOverview] = useState<OrgOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDept, setShowCreateDept] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrgOverview();
      setOverview(data);
    } catch (err: any) {
      const msg = err.message || JSON.stringify(err);
      setError(msg);
      console.error('[OrganizationPanel] loadOverview error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const openDept = (dept: Department) => {
    setSelectedDept(dept);
    setView('department');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading organization structure...</p>
      </div>
    );
  }

  if (view === 'department' && selectedDept) {
    const deptOverview = overview.find((o) => o.department.id === selectedDept.id);
    return (
      <DepartmentDetailView
        deptOverview={deptOverview!}
        onBack={() => { setView('overview'); setSelectedDept(null); }}
        onRefresh={loadOverview}
      />
    );
  }

  // ——— Overview
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Organization Structure
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage departments, designations, teams, and reporting hierarchies.
          </p>
        </div>
        <button
          onClick={() => setShowCreateDept(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Department
        </button>
      </div>

      {/* Error Banner — shows actual Supabase error */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <h3 className="font-semibold text-red-800 dark:text-red-200">Error Loading Organization Data</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1 font-mono break-all">{error}</p>
            <button onClick={loadOverview} className="mt-3 text-sm font-medium text-red-700 dark:text-red-300 underline">
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Empty state — no error, just no data yet */}
      {!error && overview.length === 0 && !loading && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">No departments found</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Run <strong>seed_org_data.sql</strong> in Supabase SQL Editor to seed the initial departments.
            </p>
          </div>
        </div>
      )}

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {overview.map((item) => (
          <DepartmentCard
            key={item.department.id}
            item={item}
            onClick={() => openDept(item.department)}
            onRefresh={loadOverview}
          />
        ))}

        {/* Add Department Placeholder */}
        <button
          onClick={() => setShowCreateDept(true)}
          className="group border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary transition-all duration-200 min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-medium text-sm">Add Department</span>
        </button>
      </div>

      {showCreateDept && (
        <CreateDepartmentModal
          onClose={() => setShowCreateDept(false)}
          onSuccess={() => { setShowCreateDept(false); loadOverview(); }}
        />
      )}
    </div>
  );
}

// ============================================================
// DEPARTMENT CARD
// ============================================================

function DepartmentCard({ item, onClick, onRefresh }: {
  item: OrgOverview;
  onClick: () => void;
  onRefresh: () => void;
}) {
  const { department, userCounts, teams, designations } = item;
  const [showMenu, setShowMenu] = useState(false);
  const colorMap: Record<string, string> = {
    'ADM': 'from-blue-500 to-indigo-600',
    'HR': 'from-violet-500 to-purple-600',
    'MKT': 'from-orange-500 to-rose-500',
  };
  const gradient = colorMap[department.code] || 'from-slate-500 to-zinc-600';

  return (
    <div
      className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className={cn('relative bg-gradient-to-br p-5', gradient)}>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-bold text-white/60 uppercase tracking-widest">{department.code}</span>
            <h3 className="text-lg font-bold text-white mt-0.5">{department.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              'px-2 py-0.5 rounded-full text-xs font-semibold',
              department.status === 'Active'
                ? 'bg-white/20 text-white'
                : 'bg-red-500/30 text-red-100'
            )}>
              {department.status}
            </div>
            {/* ⋮ Lifecycle Menu */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/25 text-white transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 z-20 bg-card border border-border rounded-xl shadow-2xl min-w-[200px] py-1 text-sm">
                  {department.status !== 'Inactive' && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm(`Deactivate "${department.name}"?\n\nExisting users keep their assignments but no new users can be added to it.`)) { setShowMenu(false); return; }
                        try { await deactivateDepartment(department.id); toast.success('Department deactivated'); onRefresh(); }
                        catch (err: any) { toast.error(err.message); }
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2"
                    >
                      <PowerOff className="w-4 h-4" /> Deactivate
                    </button>
                  )}
                  {department.status !== 'Archived' && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm(`Archive "${department.name}"?\n\nThis permanently closes the department. Data is preserved for audit.`)) { setShowMenu(false); return; }
                        try { await updateDepartment(department.id, { status: 'Archived' }); toast.success('Department archived'); onRefresh(); }
                        catch (err: any) { toast.error(err.message); }
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <PowerOff className="w-4 h-4" /> Archive
                    </button>
                  )}
                  {department.status !== 'Active' && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try { await updateDepartment(department.id, { status: 'Active' }); toast.success('Department reactivated'); onRefresh(); }
                        catch (err: any) { toast.error(err.message); }
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> Reactivate
                    </button>
                  )}
                  <div className="border-t border-border mt-1 pt-1 px-4 py-2 text-xs text-muted-foreground italic">
                    Hard delete disabled — data integrity protected
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {department.description && (
          <p className="text-sm text-white/70 mt-1 line-clamp-2">{department.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-xl font-bold text-foreground">{userCounts.total}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Members</div>
        </div>
        <div className="text-center border-x border-border">
          <div className="text-xl font-bold text-foreground">{teams.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Teams</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-foreground">{designations.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Ranks</div>
        </div>
      </div>

      {/* Designation Breakdown */}
      {Object.keys(userCounts.byDesignation).length > 0 && (
        <div className="px-4 pb-4 space-y-1.5">
          {Object.entries(userCounts.byDesignation)
            .filter(([, count]) => count > 0)
            .map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate">{name}</span>
                <span className="font-semibold text-foreground ml-2">{count}</span>
              </div>
            ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {department.head ? `Head: ${(department.head as any).name}` : 'No department head set'}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}

// ============================================================
// DEPARTMENT DETAIL VIEW
// ============================================================

function DepartmentDetailView({ deptOverview, onBack, onRefresh }: {
  deptOverview: OrgOverview;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const { department, designations, teams, userCounts } = deptOverview;
  const [activeTab, setActiveTab] = useState<'overview' | 'designations' | 'teams'>('overview');
  const [showCreateDesig, setShowCreateDesig] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);

  return (
    <div className="space-y-5">
      {/* Back Nav */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronRight className="w-4 h-4 rotate-180" />
        All Departments
      </button>

      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-primary/70 uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">{department.code}</span>
              <span className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-full',
                department.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700'
              )}>
                {department.status}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">{department.name}</h2>
            {department.description && <p className="text-sm text-muted-foreground mt-1">{department.description}</p>}
            {department.head && (
              <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                <UserCircle className="w-4 h-4" />
                Department Head: <span className="font-medium text-foreground">{(department.head as any).name}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <div className="text-center bg-white dark:bg-card border border-border rounded-xl px-4 py-3 min-w-[70px]">
              <div className="text-2xl font-bold text-foreground">{userCounts.total}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Members</div>
            </div>
            <div className="text-center bg-white dark:bg-card border border-border rounded-xl px-4 py-3 min-w-[70px]">
              <div className="text-2xl font-bold text-foreground">{teams.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Teams</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
        {(['overview', 'designations', 'teams'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all capitalize',
              activeTab === tab
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Hierarchy */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-primary" />
              Designation Hierarchy
            </h3>
            <div className="space-y-2">
              {[...designations]
                .sort((a, b) => (b.level || 0) - (a.level || 0))
                .map((desig, idx) => (
                  <div key={desig.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                      <span className="font-medium text-sm text-foreground">{desig.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {userCounts.byDesignation[desig.name] ?? 0} users
                      </span>
                    </div>
                    {idx < designations.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-muted-foreground rotate-90 absolute" style={{ display: 'none' }} />
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'designations' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateDesig(true)}
              className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover"
            >
              <Plus className="w-4 h-4" /> Add Designation
            </button>
          </div>
          {designations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No designations yet.</div>
          ) : (
            [...designations].sort((a, b) => (b.level || 0) - (a.level || 0)).map((d) => (
              <DesignationRow key={d.id} designation={d} userCount={userCounts.byDesignation[d.name] ?? 0} onRefresh={onRefresh} />
            ))
          )}
          {showCreateDesig && (
            <CreateDesignationModal
              departmentId={department.id}
              designations={designations}
              onClose={() => setShowCreateDesig(false)}
              onSuccess={() => { setShowCreateDesig(false); onRefresh(); }}
            />
          )}
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateTeam(true)}
              className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover"
            >
              <Plus className="w-4 h-4" /> Add Team
            </button>
          </div>
          {teams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No teams yet.</div>
          ) : (
            teams.map((t) => (
              <TeamRow key={t.id} team={t} onRefresh={onRefresh} />
            ))
          )}
          {showCreateTeam && (
            <CreateTeamModal
              departmentId={department.id}
              onClose={() => setShowCreateTeam(false)}
              onSuccess={() => { setShowCreateTeam(false); onRefresh(); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DESIGNATION ROW
// ============================================================

function DesignationRow({ designation, userCount, onRefresh }: {
  designation: Designation;
  userCount: number;
  onRefresh: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const handleDeactivate = async () => {
    if (!confirm(`Deactivate "${designation.name}"?`)) return;
    try {
      await deactivateDesignation(designation.id);
      toast.success('Designation deactivated');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
    setShowMenu(false);
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/20 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Shield className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{designation.name}</span>
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded-full font-medium',
            designation.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600'
          )}>
            {designation.status}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
          <span>Level {designation.level}</span>
          {designation.reports_to && <span>Reports to: {(designation.reports_to as any).name}</span>}
          <span className="text-foreground font-medium">{userCount} users</span>
        </div>
      </div>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-8 z-10 bg-card border border-border rounded-xl shadow-xl min-w-[150px] py-1">
            <button
              onClick={handleDeactivate}
              className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <PowerOff className="w-4 h-4" /> Deactivate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TEAM ROW
// ============================================================

function TeamRow({ team, onRefresh }: { team: Team; onRefresh: () => void }) {
  const [showMenu, setShowMenu] = useState(false);

  const handleDeactivate = async () => {
    if (!confirm(`Deactivate team "${team.name}"?`)) return;
    try {
      await deactivateTeam(team.id);
      toast.success('Team deactivated');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
    setShowMenu(false);
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/20 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
        <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{team.name}</span>
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded-full font-medium',
            team.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600'
          )}>
            {team.status}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {team.team_leader ? `Leader: ${(team.team_leader as any).name}` : 'No team leader assigned'}
        </div>
      </div>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-8 z-10 bg-card border border-border rounded-xl shadow-xl min-w-[150px] py-1">
            <button
              onClick={handleDeactivate}
              className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <PowerOff className="w-4 h-4" /> Deactivate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MODALS
// ============================================================

function CreateDepartmentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: org } = await supabase.from('organizations').select('id').limit(1).single();
      if (!org) throw new Error('No organization found');
      await createDepartment({ ...form, organization_id: org.id });
      toast.success(`Department "${form.name}" created successfully`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create department');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Create Department" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Department Name" required>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Admissions" className={inputCls} />
        </Field>
        <Field label="Department Code" required>
          <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="e.g. ADM" maxLength={10} className={inputCls} />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3} placeholder="What does this department do?" className={inputCls} />
        </Field>
        <ModalFooter onClose={onClose} saving={saving} submitLabel="Create Department" />
      </form>
    </ModalShell>
  );
}

function CreateDesignationModal({ departmentId, designations, onClose, onSuccess }: {
  departmentId: string;
  designations: Designation[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ name: '', level: 10, reports_to_designation_id: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createDesignation({
        department_id: departmentId,
        name: form.name,
        level: form.level,
        reports_to_designation_id: form.reports_to_designation_id || null,
      });
      toast.success(`Designation "${form.name}" created`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create designation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Create Designation" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Designation Name" required>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Academic Counselor" className={inputCls} />
        </Field>
        <Field label="Authority Level" required>
          <input required type="number" min={1} max={100} value={form.level}
            onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) || 10 })}
            className={inputCls} />
          <p className="text-xs text-muted-foreground mt-1">Higher number = more authority. Admin=100, Manager=80, TL=50, Exec=10</p>
        </Field>
        <Field label="Reports To">
          <select value={form.reports_to_designation_id}
            onChange={(e) => setForm({ ...form, reports_to_designation_id: e.target.value })}
            className={inputCls}>
            <option value="">— None (Top Level) —</option>
            {[...designations].sort((a, b) => (b.level || 0) - (a.level || 0)).map((d) => (
              <option key={d.id} value={d.id}>{d.name} (Level {d.level})</option>
            ))}
          </select>
        </Field>
        <ModalFooter onClose={onClose} saving={saving} submitLabel="Create Designation" />
      </form>
    </ModalShell>
  );
}

function CreateTeamModal({ departmentId, onClose, onSuccess }: {
  departmentId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ name: '', team_leader_id: '' });
  const [eligibleLeaders, setEligibleLeaders] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch users in this department who are Team Leaders or above
    supabase.from('users')
      .select('id, name, designation:designations(name)')
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .then(({ data }) => setEligibleLeaders(data || []));
  }, [departmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createTeam({
        department_id: departmentId,
        name: form.name,
        team_leader_id: form.team_leader_id || null,
      });
      toast.success(`Team "${form.name}" created`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create team');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Create Team" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Team Name" required>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Team Alpha" className={inputCls} />
        </Field>
        <Field label="Team Leader">
          <select value={form.team_leader_id} onChange={(e) => setForm({ ...form, team_leader_id: e.target.value })} className={inputCls}>
            <option value="">— Assign later —</option>
            {eligibleLeaders.map((u) => (
              <option key={u.id} value={u.id}>{u.name}{u.designation ? ` (${(u.designation as any).name})` : ''}</option>
            ))}
          </select>
        </Field>
        <ModalFooter onClose={onClose} saving={saving} submitLabel="Create Team" />
      </form>
    </ModalShell>
  );
}

// ============================================================
// SHARED HELPERS
// ============================================================

const inputCls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold text-lg text-foreground">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ onClose, saving, submitLabel }: { onClose: () => void; saving: boolean; submitLabel: string }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
        Cancel
      </button>
      <button type="submit" disabled={saving}
        className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
        {saving ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}
