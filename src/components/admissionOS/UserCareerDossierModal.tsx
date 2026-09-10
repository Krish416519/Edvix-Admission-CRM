import React, { useEffect, useState } from 'react';
import { 
  X, User, Mail, Phone, Building2, Award, TrendingUp, 
  GraduationCap, IndianRupee, ExternalLink, Calendar, 
  Clock, Flame, Shield, ArrowUpRight, Search, CheckCircle2,
  UserCheck, Users, ChevronRight, Network, Layers
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserPerformanceMetric } from '../../types/commandCenter';
import { BusinessIntelligence } from '../../lib/ai/BusinessIntelligence';
import { useNavigate } from 'react-router-dom';

interface UserCareerDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  userMetric: UserPerformanceMetric | null;
  periodLabel: string;
  onSelectUserById?: (userId: string) => void;
}

export function UserCareerDossierModal({
  isOpen,
  onClose,
  userMetric,
  periodLabel,
  onSelectUserById,
}: UserCareerDossierModalProps) {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load leads when user changes
  useEffect(() => {
    if (!isOpen || !userMetric) return;
    setLoadingLeads(true);
    BusinessIntelligence.getUserAssignedLeads(userMetric.userId)
      .then(data => {
        setLeads(data);
        setLoadingLeads(false);
      })
      .catch(err => {
        console.error('Failed to load user leads:', err);
        setLoadingLeads(false);
      });
  }, [isOpen, userMetric]);

  if (!isOpen || !userMetric) return null;

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const tenureYears = (userMetric.tenureDays / 365).toFixed(1);

  const filteredLeads = leads.filter(l => {
    const matchesSearch = !searchTerm.trim() || 
      l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.lead_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || l.lead_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ['All', ...Array.from(new Set(leads.map(l => l.lead_status).filter(Boolean)))];

  const hasDirectReports = (userMetric.directReports && userMetric.directReports.length > 0) || userMetric.directReportsCount > 0;
  const isOrgHead = userMetric.designationLevel >= 100 || !userMetric.managerId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/10 to-indigo-500/20 border border-primary/20 flex items-center justify-center text-primary font-extrabold text-lg shadow-sm shrink-0">
              {userMetric.avatarUrl ? (
                <img src={userMetric.avatarUrl} alt={userMetric.userName} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                userMetric.userName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground">{userMetric.userName}</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {userMetric.designationName} (Lvl {userMetric.designationLevel})
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  {userMetric.teamName} &bull; Admissions
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {userMetric.userEmail}
                </span>
                {userMetric.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {userMetric.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Tenure: {userMetric.tenureDays} days ({tenureYears} yrs)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => {
                onClose();
                navigate(`/all-leads?counselor=${userMetric.userId}`);
              }}
              className="h-9 px-3.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-sm"
            >
              Open in All Leads <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              aria-label="Close dossier"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          
          {/* SECTION: ORGANIZATIONAL REPORTING CHAIN & HIERARCHY ("Under Whom He Comes") */}
          <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <Network className="w-4 h-4" /> Chain of Command & Reporting Line
              </h3>
              <span className="text-[11px] font-semibold text-muted-foreground">
                Level {userMetric.designationLevel} &bull; Admissions Department
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Direct Reporting Manager Card */}
              <div className="p-3 bg-card border border-border rounded-xl space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide block">
                  Direct Reporting Manager
                </span>
                {isOrgHead ? (
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Head of Department / Apex</p>
                      <p className="text-xs text-muted-foreground">Highest authority in Admissions & Sales</p>
                    </div>
                  </div>
                ) : userMetric.managerName ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{userMetric.managerName}</p>
                        <p className="text-xs text-muted-foreground">{userMetric.managerDesignation || 'Supervisor'} &bull; {userMetric.managerEmail}</p>
                      </div>
                    </div>
                    {onSelectUserById && userMetric.managerId && (
                      <button
                        onClick={() => onSelectUserById(userMetric.managerId!)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                      >
                        View Dossier
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Reports to {userMetric.reportsToDesignationName || 'Admissions Head'}</p>
                )}
              </div>

              {/* Hierarchy Flow Breadcrumb */}
              <div className="p-3 bg-card border border-border rounded-xl space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide block">
                  Hierarchy Path (Ascending)
                </span>
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {userMetric.userName} ({userMetric.designationName.split(' ')[0]})
                  </span>
                  {userMetric.reportingChain.map((node, i) => (
                    <React.Fragment key={node.id}>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span 
                        onClick={() => onSelectUserById && onSelectUserById(node.id)}
                        className={cn(
                          "px-2 py-0.5 rounded font-semibold transition-colors",
                          onSelectUserById ? "cursor-pointer hover:bg-primary/10 hover:text-primary text-foreground" : "text-muted-foreground"
                        )}
                        title="Click to switch to this supervisor's dossier"
                      >
                        {node.name} ({node.designation.split(' ')[0]})
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* If user manages staff: display Direct Reports & Team Roll-up */}
            {hasDirectReports && (
              <div className="mt-3 pt-3 border-t border-indigo-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Supervised Admissions Team ({userMetric.directReports.length} Direct Counselors)
                  </span>
                  {userMetric.teamRollup && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Team Conversion: {userMetric.teamRollup.teamConversionRate}% ({userMetric.teamRollup.totalTeamAdmissions}/{userMetric.teamRollup.totalTeamLeads} enrolled)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {userMetric.directReports.map(sub => (
                    <div
                      key={sub.id}
                      onClick={() => onSelectUserById && onSelectUserById(sub.id)}
                      className="p-2.5 rounded-lg bg-card border border-border hover:border-primary transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {sub.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{sub.designation}</p>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mt-2 pt-1 border-t border-border/50">
                        <span>{sub.periodLeads} leads</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{sub.periodEnrolled} adm</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Career vs Period Comparison Matrix */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Award className="w-4 h-4 text-primary" /> Individual Performance Scorecard (Career vs. {periodLabel})
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total Leads */}
              <div className="p-4 rounded-xl border border-border bg-card/60 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">Assigned Leads</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-foreground">{userMetric.careerLeadsCount}</span>
                  <span className="text-xs text-muted-foreground font-semibold">career</span>
                </div>
                <div className="text-xs text-primary font-bold pt-1 border-t border-border/50">
                  {userMetric.periodLeadsCount} in {periodLabel}
                </div>
              </div>

              {/* Admissions Closed */}
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">Admissions Closed</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{userMetric.careerAdmissionsCount}</span>
                  <span className="text-xs text-muted-foreground font-semibold">career</span>
                </div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold pt-1 border-t border-emerald-500/20">
                  {userMetric.periodAdmissionsCount} in {periodLabel}
                </div>
              </div>

              {/* Conversion Rate */}
              <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-1">
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 block">Conversion Rate</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{userMetric.careerConversionRate}%</span>
                  <span className="text-xs text-muted-foreground font-semibold">career</span>
                </div>
                <div className="text-xs text-indigo-700 dark:text-indigo-400 font-bold pt-1 border-t border-indigo-500/20">
                  {userMetric.periodConversionRate}% in {periodLabel}
                </div>
              </div>

              {/* Revenue Reconciled */}
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-1">
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block">Revenue Generated</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-base sm:text-lg font-extrabold text-blue-600 dark:text-blue-400">{fmt(userMetric.careerRevenue)}</span>
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-400 font-bold pt-1 border-t border-blue-500/20">
                  {fmt(userMetric.periodRevenue)} in {periodLabel}
                </div>
              </div>
            </div>
          </div>

          {/* Current Lead Pipeline Intent Breakdown */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span>Current Pipeline Intent Distribution</span>
              <span className="text-muted-foreground font-normal">
                {leads.length} Active Leads Assigned
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 block">🔥 HOT</span>
                <span className="text-lg font-extrabold text-foreground">
                  {leads.filter(l => l.temperature === 'Hot' || l.lead_status === 'Hot' || l.lead_status === 'Qualified').length}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">⚡ WARM</span>
                <span className="text-lg font-extrabold text-foreground">
                  {leads.filter(l => l.temperature === 'Warm' || l.lead_status === 'Warm' || l.lead_status === 'Connected').length}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block">❄ COLD</span>
                <span className="text-lg font-extrabold text-foreground">
                  {leads.filter(l => !l.temperature || l.temperature === 'Cold' || l.lead_status === 'Inquiry' || l.lead_status === 'New').length}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Leads Table & Drill-Down */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Assigned Students & Inquiries ({filteredLeads.length})
              </h3>

              <div className="flex items-center gap-2">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="h-8 px-2 text-xs bg-background border border-border rounded-lg outline-none cursor-pointer"
                >
                  {statuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search assigned leads..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="h-8 pl-7 pr-2.5 text-xs bg-background border border-border rounded-lg outline-none focus:border-primary w-40"
                  />
                </div>
              </div>
            </div>

            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-muted-foreground uppercase bg-muted/50 border-b border-border sticky top-0 z-10">
                    <tr>
                      <th className="px-3.5 py-2.5 font-semibold">Lead ID / Student</th>
                      <th className="px-3.5 py-2.5 font-semibold">Stage</th>
                      <th className="px-3.5 py-2.5 font-semibold">Intent</th>
                      <th className="px-3.5 py-2.5 font-semibold">Contact</th>
                      <th className="px-3.5 py-2.5 font-semibold">Assigned Date</th>
                      <th className="px-3.5 py-2.5 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loadingLeads ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                          <span>Loading student files...</span>
                        </td>
                      </tr>
                    ) : filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          No student files match current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map(l => (
                        <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3.5 py-2.5">
                            <span className="font-bold text-foreground block">{l.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{l.lead_number}</span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-secondary-foreground">
                              {l.lead_status}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            {l.temperature === 'Hot' ? (
                              <span className="text-orange-600 font-bold text-[11px]">🔥 Hot</span>
                            ) : l.temperature === 'Warm' ? (
                              <span className="text-amber-600 font-bold text-[11px]">⚡ Warm</span>
                            ) : (
                              <span className="text-blue-500 font-semibold text-[11px]">❄ Cold</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-foreground">
                            <span>{l.phone || l.email || '—'}</span>
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-foreground">
                            {new Date(l.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <button
                              onClick={() => {
                                onClose();
                                navigate(`/all-leads/${l.id}`);
                              }}
                              className="px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded text-[11px] inline-flex items-center gap-1 transition-colors"
                            >
                              Open <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
