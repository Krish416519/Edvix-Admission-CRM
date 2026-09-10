import React, { useEffect, useState } from 'react';
import { 
  X, User, Mail, Phone, Building2, Award, TrendingUp, 
  GraduationCap, IndianRupee, ExternalLink, Calendar, 
  Clock, Flame, Shield, ArrowUpRight, Search, CheckCircle2
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
}

export function UserCareerDossierModal({
  isOpen,
  onClose,
  userMetric,
  periodLabel,
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
                  {userMetric.designationName}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  {userMetric.teamName}
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
          {/* Career vs Period Comparison Matrix */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Award className="w-4 h-4 text-primary" /> Performance Scorecard (Career vs. {periodLabel})
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

              {/* Filters within dossier */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search student..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 pr-3 text-xs bg-card border border-border rounded-lg outline-none focus:border-primary w-40 sm:w-48"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-card border border-border rounded-lg outline-none focus:border-primary"
                >
                  {statuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingLeads ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs">Fetching assigned leads from Supabase...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl">
                No matching leads assigned to this user.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
                {filteredLeads.map(lead => {
                  const intentBadge = lead.temperature === 'Hot' ? '🔥 HOT' :
                    lead.temperature === 'Warm' ? '⚡ WARM' : '❄ COLD';

                  return (
                    <div
                      key={lead.id}
                      className="p-3.5 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground truncate">
                            {lead.name}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {lead.lead_status || 'Inquiry'}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            lead.temperature === 'Hot' ? "bg-red-500/10 text-red-600 border-red-500/20" :
                            lead.temperature === 'Warm' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                            "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          )}>
                            {intentBadge}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span>ID: {lead.lead_number}</span>
                          {lead.email && <span>• {lead.email}</span>}
                          {lead.phone && <span>• {lead.phone}</span>}
                          {lead.course?.name && <span>• Course: {lead.course.name}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => {
                            onClose();
                            navigate(`/all-leads/${lead.id}`);
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors inline-flex items-center gap-1 shadow-xs"
                        >
                          View Lead <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-border bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
          <span>Authoritative Supabase Career Dossier</span>
          <span>{leads.length} Total Assigned Leads</span>
        </div>
      </div>
    </div>
  );
}
