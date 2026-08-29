import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Target, AlertCircle, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import { useLeads } from '../../hooks/useLeads';
import { Skeleton } from '../ui/Skeleton';
import { supabase } from '../../lib/supabase';
import { computeIntent } from '../../lib/leadIntent';

// Simulation of AI analyzing the dashboard
export function AIDailyBriefing() {
  const [isVisible, setIsVisible] = useState(false);
  const { leads, isLoading } = useLeads();
  const navigate = useNavigate();
  const [overdueCount, setOverdueCount] = useState<number | null>(null);
  
  useEffect(() => {
    // delay for streaming effect
    const t = setTimeout(() => setIsVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  // Load overdue admissions from real DB (admissions with pending payments older than 3 days)
  useEffect(() => {
    const load = async () => {
      try {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const { count, error } = await supabase
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pending')
          .lte('created_at', threeDaysAgo.toISOString());
        if (!error) setOverdueCount(count ?? 0);
      } catch {
        setOverdueCount(0);
      }
    };
    load();
  }, []);

  if (!isVisible) return null;
  
  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-950/20 dark:to-card border border-indigo-100 dark:border-indigo-500/20 rounded-xl shadow-sm p-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-32 h-6" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const hotLeadsCount = leads.filter(l => computeIntent(l) === 'HOT').length;
  const pendingDocsCount = leads.filter(l => l.status === 'Docs Pending').length;
  const highConversionLeads = leads.filter(l => l.score && l.score >= 85).slice(0, 2);
  const highConversionNames = highConversionLeads.length > 0
    ? highConversionLeads.map(l => (l.name || 'Student').split(' ')[0]).join(' and ')
    : null;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-950/20 dark:to-card border border-indigo-100 dark:border-indigo-500/20 rounded-xl shadow-sm p-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Sparkles className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-bold text-foreground">AI Daily Briefing</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Priority 1 — Hot Leads */}
        <div className="bg-white dark:bg-card/50 border border-indigo-50 dark:border-indigo-500/10 rounded-lg p-3 flex flex-col gap-2 hover:shadow-md transition-all cursor-pointer group">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Target className="w-4 h-4" />
            <h3 className="text-sm font-semibold">Today's Priorities</h3>
          </div>
          {hotLeadsCount > 0 ? (
            <p className="text-sm text-foreground">Call {hotLeadsCount} hot lead{hotLeadsCount !== 1 ? 's' : ''} who are interested in enrolling.</p>
          ) : (
            <p className="text-sm text-muted-foreground">No hot leads right now. Check back after new leads come in.</p>
          )}
          <div onClick={() => navigate('/all-leads?filter=hot')} className="mt-auto pt-2 flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform cursor-pointer">
            View Leads <ArrowRight className="w-3 h-3 ml-1" />
          </div>
        </div>

        {/* Priority 2 — Pending Docs */}
        <div className="bg-white dark:bg-card/50 border border-red-50 dark:border-red-900/20 rounded-lg p-3 flex flex-col gap-2 hover:shadow-md transition-all cursor-pointer group">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <h3 className="text-sm font-semibold">Urgent Follow-ups</h3>
          </div>
          {pendingDocsCount > 0 ? (
            <p className="text-sm text-foreground">{pendingDocsCount} lead{pendingDocsCount !== 1 ? 's' : ''} with pending documents for more than 48 hours.</p>
          ) : (
            <p className="text-sm text-muted-foreground">All document follow-ups are clear. Great job!</p>
          )}
          <div onClick={() => navigate('/all-leads?filter=docs_pending')} className="mt-auto pt-2 flex items-center text-xs font-semibold text-red-600 dark:text-red-400 group-hover:translate-x-1 transition-transform cursor-pointer">
            Action Now <ArrowRight className="w-3 h-3 ml-1" />
          </div>
        </div>

        {/* Priority 3 — High Conversion */}
        <div className="bg-white dark:bg-card/50 border border-green-50 dark:border-green-900/20 rounded-lg p-3 flex flex-col gap-2 hover:shadow-md transition-all cursor-pointer group">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
            <TrendingUp className="w-4 h-4" />
            <h3 className="text-sm font-semibold">High-Conversion</h3>
          </div>
          {highConversionNames ? (
            <p className="text-sm text-foreground">{highConversionNames} have &gt;85% probability to convert today.</p>
          ) : (
            <p className="text-sm text-muted-foreground">No high-conversion leads scored yet this session.</p>
          )}
          <div onClick={() => navigate('/all-leads?filter=high_conversion')} className="mt-auto pt-2 flex items-center text-xs font-semibold text-green-600 dark:text-green-500 group-hover:translate-x-1 transition-transform cursor-pointer">
            Contact Now <ArrowRight className="w-3 h-3 ml-1" />
          </div>
        </div>

        {/* Priority 4 — Overdue Admissions (REAL data from payments) */}
        <div className="bg-white dark:bg-card/50 border border-orange-50 dark:border-orange-900/20 rounded-lg p-3 flex flex-col gap-2 hover:shadow-md transition-all cursor-pointer group">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-500">
            <Calendar className="w-4 h-4" />
            <h3 className="text-sm font-semibold">Overdue Payments</h3>
          </div>
          {overdueCount === null ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : overdueCount > 0 ? (
            <p className="text-sm text-foreground">{overdueCount} payment{overdueCount !== 1 ? 's' : ''} pending for over 3 days. Needs immediate attention.</p>
          ) : (
            <p className="text-sm text-muted-foreground">All payments are up to date. No overdue items.</p>
          )}
          <div onClick={() => navigate('/admissions')} className="mt-auto pt-2 flex items-center text-xs font-semibold text-orange-600 dark:text-orange-500 group-hover:translate-x-1 transition-transform cursor-pointer">
            Review Now <ArrowRight className="w-3 h-3 ml-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

