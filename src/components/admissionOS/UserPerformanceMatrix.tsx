import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, TrendingUp, Award, IndianRupee, GraduationCap,
  Search, Filter, RefreshCw, ChevronRight, ArrowUpRight,
  Flame, Clock, Calendar, CheckCircle2, AlertCircle, Shield,
  UserCheck, Network, Briefcase
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserPerformanceMetric, PerformanceTimeHorizon } from '../../types/commandCenter';
import { BusinessIntelligence } from '../../lib/ai/BusinessIntelligence';
import { UserCareerDossierModal } from './UserCareerDossierModal';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const TIME_HORIZONS: { key: PerformanceTimeHorizon; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7days', label: '7 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'thisQuarter', label: 'This Quarter' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'career', label: 'All Time (Career)' },
];

export function UserPerformanceMatrix() {
  const navigate = useNavigate();
  const [selectedHorizon, setSelectedHorizon] = useState<PerformanceTimeHorizon>('thisMonth');
  const [designations, setDesignations] = useState<{ id: string; name: string }[]>([]);
  const [selectedDesignation, setSelectedDesignation] = useState<string>('all');
  const [managers, setManagers] = useState<{ id: string; name: string; designation: string; directReportsCount: number }[]>([]);
  const [selectedManager, setSelectedManager] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [metrics, setMetrics] = useState<UserPerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Selected user for Dossier Modal
  const [selectedUser, setSelectedUser] = useState<UserPerformanceMetric | null>(null);

  // Fetch designations once
  useEffect(() => {
    const loadDesignations = async () => {
      const { data } = await supabase
        .from('designations')
        .select('id, name')
        .order('level', { ascending: false });
      if (data) {
        // Only keep Admissions/Sales relevant designations
        const salesDesigs = data.filter(d => 
          !d.name.toLowerCase().includes('hr') && 
          !d.name.toLowerCase().includes('finance') &&
          !d.name.toLowerCase().includes('marketing admin')
        );
        setDesignations(salesDesigs);
      }
    };
    loadDesignations();
  }, []);

  // Fetch managers list
  const loadManagersList = useCallback(async () => {
    try {
      const mgrList = await BusinessIntelligence.getAdmissionsManagers();
      setManagers(mgrList);
    } catch (e) {
      console.error('Failed to load managers list:', e);
    }
  }, []);

  useEffect(() => {
    loadManagersList();
  }, [loadManagersList]);

  // Fetch performance data
  const loadPerformanceData = useCallback(async (isSilent: boolean = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await BusinessIntelligence.getUserPerformanceMetrics(
        selectedHorizon,
        selectedDesignation,
        searchTerm,
        selectedManager
      );
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load user performance data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedHorizon, selectedDesignation, searchTerm, selectedManager]);

  useEffect(() => {
    loadPerformanceData(false);
  }, [loadPerformanceData]);

  const activeHorizonLabel = TIME_HORIZONS.find(h => h.key === selectedHorizon)?.label || 'This Month';

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  // Aggregate Topline Summary
  const totalStaff = metrics.length;
  const totalPeriodLeads = metrics.reduce((s, m) => s + m.periodLeadsCount, 0);
  const totalCareerLeads = metrics.reduce((s, m) => s + m.careerLeadsCount, 0);
  const totalPeriodAdmissions = metrics.reduce((s, m) => s + m.periodAdmissionsCount, 0);
  const totalCareerAdmissions = metrics.reduce((s, m) => s + m.careerAdmissionsCount, 0);
  const totalPeriodRevenue = metrics.reduce((s, m) => s + m.periodRevenue, 0);
  const totalCareerRevenue = metrics.reduce((s, m) => s + m.careerRevenue, 0);
  const avgConversionRate = totalPeriodLeads > 0 
    ? Math.round((totalPeriodAdmissions / totalPeriodLeads) * 100) 
    : (totalCareerLeads > 0 ? Math.round((totalCareerAdmissions / totalCareerLeads) * 100) : 0);

  return (
    <div className="space-y-6">
      {/* Filter Control Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Admissions & Sales Performance Center
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                Admissions Department
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Strictly tracking enrollment advisory output, conversion velocity, revenue, and supervisory reporting hierarchies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedManager !== 'all' && (
              <button
                onClick={() => setSelectedManager('all')}
                className="h-9 px-3 border border-amber-500/30 bg-amber-500/10 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 transition-colors"
                title="Clear manager filter"
              >
                <span>Manager Filter Active</span>
                <span className="font-extrabold">&times;</span>
              </button>
            )}

            <button
              onClick={() => {
                loadPerformanceData(true);
                loadManagersList();
              }}
              disabled={refreshing}
              className="h-9 px-3.5 border border-border bg-card hover:bg-muted/50 rounded-xl text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors shadow-sm"
              title="Refresh performance data"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-primary")} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-border/60">
          {/* Segmented Time Horizons */}
          <div className="inline-flex items-center p-1 bg-muted/60 border border-border rounded-xl text-xs overflow-x-auto hide-scrollbar flex-nowrap max-w-full">
            {TIME_HORIZONS.map(h => (
              <button
                key={h.key}
                onClick={() => setSelectedHorizon(h.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap",
                  selectedHorizon === h.key
                    ? "bg-background text-foreground shadow-sm border border-border text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {h.label}
              </button>
            ))}
          </div>

          {/* Designation Dropdown, Manager Filter, & Search */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Manager / Supervisor Filter */}
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={selectedManager}
                onChange={e => setSelectedManager(e.target.value)}
                className={cn(
                  "h-9 pl-3 pr-8 text-xs font-semibold bg-background border rounded-xl text-foreground outline-none focus:border-primary shadow-sm w-full sm:w-44 cursor-pointer",
                  selectedManager !== 'all' ? "border-primary text-primary font-bold bg-primary/5" : "border-border"
                )}
                title="Filter counselors reporting under a specific Manager / Supervisor"
              >
                <option value="all">All Supervisors / TLs</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>
                    Under: {m.name} ({m.designation.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>

            {/* Designation Selector */}
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={selectedDesignation}
                onChange={e => setSelectedDesignation(e.target.value)}
                className="h-9 pl-3 pr-8 text-xs font-semibold bg-background border border-border rounded-xl text-foreground outline-none focus:border-primary shadow-sm w-full sm:w-40 cursor-pointer"
              >
                <option value="all">All Designations</option>
                {designations.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search staff / manager..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-9 pl-8 pr-3 text-xs bg-background border border-border rounded-xl outline-none focus:border-primary w-full sm:w-44 shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Topline Aggregate Scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Active Admissions Staff</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{totalStaff}</p>
          <p className="text-[11px] text-muted-foreground">Sales & advisory profiles</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Period Leads Assigned</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {selectedHorizon === 'career' ? totalCareerLeads : totalPeriodLeads}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {selectedHorizon === 'career' ? 'Lifetime volume' : `In ${activeHorizonLabel} (${totalCareerLeads} career)`}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Admissions Closed</span>
            <GraduationCap className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {selectedHorizon === 'career' ? totalCareerAdmissions : totalPeriodAdmissions}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {selectedHorizon === 'career' ? 'Lifetime closed' : `In ${activeHorizonLabel} (${totalCareerAdmissions} career)`}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Conversion Rate</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{avgConversionRate}%</p>
          <p className="text-[11px] text-muted-foreground">Enrolled / Assigned</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Revenue Generated</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 truncate" title={fmt(selectedHorizon === 'career' ? totalCareerRevenue : totalPeriodRevenue)}>
            {fmt(selectedHorizon === 'career' ? totalCareerRevenue : totalPeriodRevenue)}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {selectedHorizon === 'career' ? 'Career Collections' : `In ${activeHorizonLabel}`}
          </p>
        </div>
      </div>

      {/* Main Staff Performance Table with Hierarchical Reporting Structure */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-muted/20">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <span>Admissions Staff Performance & Chain of Command</span>
              {selectedManager !== 'all' && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  Filtered to Supervisees of: {managers.find(m => m.id === selectedManager)?.name}
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">Click any staff row to open their full career dossier, reporting chain, and student pipeline.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary self-start sm:self-center">
            {metrics.length} Staff Profiles
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Staff Member</th>
                <th className="px-4 py-3.5 font-semibold">Designation & Level</th>
                <th className="px-4 py-3.5 font-semibold">Reports To (Chain)</th>
                <th className="px-4 py-3.5 font-semibold text-center">Assigned Leads</th>
                <th className="px-4 py-3.5 font-semibold text-center">Pipeline (🔥 / ⚡ / ❄)</th>
                <th className="px-4 py-3.5 font-semibold text-center">Admissions</th>
                <th className="px-4 py-3.5 font-semibold text-center">Conversion %</th>
                <th className="px-4 py-3.5 font-semibold text-right">Revenue (₹)</th>
                <th className="px-4 py-3.5 font-semibold text-center">Tenure</th>
                <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-xs font-medium">Aggregating admissions performance & reporting hierarchy...</span>
                  </td>
                </tr>
              ) : metrics.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="text-sm font-semibold">No admissions staff records match your criteria</p>
                    <p className="text-xs mt-1">Try resetting the manager dropdown or clearing your search term.</p>
                  </td>
                </tr>
              ) : (
                metrics.map((m, idx) => {
                  const isOrgHead = m.designationLevel >= 100 || !m.managerId;
                  const isManager = m.directReportsCount > 0 || m.designationLevel >= 50;

                  return (
                    <tr
                      key={m.userId}
                      onClick={() => setSelectedUser(m)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      {/* Name & Avatar */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                            {m.avatarUrl ? (
                              <img src={m.avatarUrl} alt={m.userName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              m.userName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                                {m.userName}
                              </span>
                              {idx === 0 && (
                                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                  Top
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground block">{m.userEmail}</span>
                          </div>
                        </div>
                      </td>

                      {/* Designation & Level */}
                      <td className="px-4 py-3.5">
                        <div>
                          <span className="text-xs font-semibold text-foreground block">
                            {m.designationName}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                              Lvl {m.designationLevel}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {m.teamName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Reporting Hierarchy ("Who reports to whom / Under whom he comes") */}
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        {isOrgHead ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 w-fit">
                              <Shield className="w-3 h-3" /> Org / Admissions Head
                            </span>
                            {m.directReportsCount > 0 && (
                              <span 
                                onClick={() => setSelectedManager(m.userId)}
                                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer mt-1 inline-flex items-center gap-1"
                                title="Click to view staff reporting to this head"
                              >
                                <Users className="w-3 h-3" /> Oversees {m.directReportsCount} Team Members
                              </span>
                            )}
                          </div>
                        ) : m.managerName ? (
                          <div className="flex flex-col space-y-0.5">
                            <span 
                              onClick={() => setSelectedManager(m.managerId || 'all')}
                              className="text-xs font-bold text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                              title={`Click to filter matrix to all staff under ${m.managerName}`}
                            >
                              <UserCheck className="w-3.5 h-3.5 text-primary" /> {m.managerName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {m.managerDesignation || m.reportsToDesignationName || 'Supervisor'}
                            </span>
                            {m.directReportsCount > 0 && (
                              <span 
                                onClick={() => setSelectedManager(m.userId)}
                                className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer pt-0.5"
                                title="Click to filter to supervisees of this manager"
                              >
                                👥 Manages {m.directReportsCount} Counselors
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Reports to {m.reportsToDesignationName || 'Admissions Head'}
                          </span>
                        )}
                      </td>

                      {/* Leads Handled */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-sm font-extrabold text-foreground">
                          {selectedHorizon === 'career' ? m.careerLeadsCount : m.periodLeadsCount}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          {m.careerLeadsCount} career
                        </span>
                      </td>

                      {/* Pipeline Intent Breakdown */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold">
                          <span className="text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded" title="Hot Leads">
                            🔥 {m.periodHotCount}
                          </span>
                          <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded" title="Warm Leads">
                            ⚡ {m.periodWarmCount}
                          </span>
                          <span className="text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded" title="Cold Leads">
                            ❄ {m.periodColdCount}
                          </span>
                        </div>
                      </td>

                      {/* Admissions Closed */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                          {selectedHorizon === 'career' ? m.careerAdmissionsCount : m.periodAdmissionsCount}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          {m.careerAdmissionsCount} career
                        </span>
                      </td>

                      {/* Conversion Rate */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-bold inline-block",
                          m.careerConversionRate >= 15 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400" :
                          m.careerConversionRate >= 5 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400" :
                          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        )}>
                          {selectedHorizon === 'career' ? m.careerConversionRate : m.periodConversionRate}%
                        </span>
                      </td>

                      {/* Revenue */}
                      <td className="px-4 py-3.5 text-right font-bold text-foreground">
                        <span>{fmt(selectedHorizon === 'career' ? m.careerRevenue : m.periodRevenue)}</span>
                        <span className="text-[11px] text-muted-foreground block font-normal">
                          {fmt(m.careerRevenue)} career
                        </span>
                      </td>

                      {/* Tenure */}
                      <td className="px-4 py-3.5 text-center text-xs text-muted-foreground">
                        <span>{m.tenureDays}d</span>
                        <span className="text-[10px] text-muted-foreground/80 block">
                          ({(m.tenureDays / 365).toFixed(1)}y)
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedUser(m)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                          >
                            Dossier
                          </button>
                          <button
                            onClick={() => navigate(`/all-leads?counselor=${m.userId}`)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors inline-flex items-center gap-1"
                            title="Open filtered leads for this counselor"
                          >
                            Leads <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Career Dossier Modal */}
      <UserCareerDossierModal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        userMetric={selectedUser}
        periodLabel={activeHorizonLabel}
        onSelectUserById={async (userId) => {
          const found = metrics.find(m => m.userId === userId);
          if (found) setSelectedUser(found);
        }}
      />
    </div>
  );
}
