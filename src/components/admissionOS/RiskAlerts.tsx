import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Shield, Clock, ArrowUpRight, CheckCircle2,
  Filter, RefreshCw, UserX, AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { AdmissionOS } from '../../lib/ai/AdmissionOS';
import { RiskAlertItem, RiskSeverity } from '../../types/commandCenter';
import { useNavigate } from 'react-router-dom';

const SEVERITY_CONFIG: Record<RiskSeverity, { bg: string; text: string; border: string }> = {
  Critical: {
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-l-red-500',
  },
  High: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-l-orange-500',
  },
  Medium: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-l-amber-500',
  },
  Low: {
    bg: 'bg-slate-50 dark:bg-slate-900/40',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-l-slate-400',
  },
};

export function RiskAlerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<RiskAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Lead' | 'Admission' | 'Operational'>('All');

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await AdmissionOS.runRiskScan();
      setAlerts(data);
    } catch (e) {
      console.error('Failed to run risk scan:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const dismissAlert = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const filteredAlerts = categoryFilter === 'All'
    ? alerts
    : alerts.filter(a => a.category === categoryFilter);

  const criticalCount = alerts.filter(a => a.severity === 'Critical').length;

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-red-500/5 via-amber-500/2 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Risk Radar</h3>
            <p className="text-[11px] text-muted-foreground">Deterministic pipeline churn & delay alerts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
              {criticalCount} Critical
            </span>
          )}
          <button
            onClick={loadAlerts}
            className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            title="Re-run risk scan"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-border/60 bg-muted/20 flex items-center gap-1.5 overflow-x-auto text-xs">
        {(['All', 'Lead', 'Admission', 'Operational'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              "px-2.5 py-1 rounded-lg font-medium transition-all shrink-0",
              categoryFilter === cat
                ? "bg-background text-foreground shadow-sm font-semibold border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {cat}
            {cat !== 'All' && ` (${alerts.filter(a => a.category === cat).length})`}
          </button>
        ))}
      </div>

      {/* Risk Items */}
      <div className="divide-y divide-border/60 overflow-y-auto max-h-[380px] custom-scrollbar flex-1">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground space-y-2">
            <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Scanning 500+ pipeline records for churn...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground space-y-1.5">
            <Shield className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold text-foreground">Pipeline In SLA</p>
            <p className="text-xs">No students or tasks currently exceeding critical churn thresholds.</p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const style = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.Medium;

            return (
              <div
                key={alert.id}
                className={cn(
                  "p-4 transition-all hover:bg-muted/30 border-l-4 space-y-2",
                  style.border
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", style.bg, style.text)}>
                        {alert.severity}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate">
                        {alert.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {alert.description}
                    </p>
                  </div>
                  <button
                    onClick={(e) => dismissAlert(alert.id, e)}
                    className="text-xs text-muted-foreground hover:text-foreground shrink-0 p-1"
                    title="Dismiss alert"
                  >
                    Dismiss
                  </button>
                </div>

                {/* Evidence Chip */}
                <div className="text-[11px] font-medium bg-muted/40 px-2.5 py-1 rounded-md text-muted-foreground inline-flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 text-muted-foreground/70" />
                  <span>{alert.evidence}</span>
                </div>

                {/* Action CTA */}
                <div className="pt-1 flex items-center justify-between">
                  <button
                    onClick={() => navigate(alert.actionRoute)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    {alert.suggestedAction} <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
