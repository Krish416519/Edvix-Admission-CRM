import { useState, useEffect } from 'react';
import {
  AlertTriangle, Shield, Clock, UserX, FileX, CreditCard, Users2,
  Loader2, CheckCircle2, ChevronRight, Brain
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { AdmissionOS, RiskAlert } from '../../lib/ai/AdmissionOS';
import { useNavigate } from 'react-router-dom';

const SEVERITY_STYLES: Record<string, { bg: string; icon: string; border: string }> = {
  Critical: {
    bg: 'bg-red-50 dark:bg-red-900/10',
    icon: 'text-red-600',
    border: 'border-l-red-500',
  },
  High: {
    bg: 'bg-orange-50 dark:bg-orange-900/10',
    icon: 'text-orange-600',
    border: 'border-l-orange-500',
  },
  Medium: {
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    icon: 'text-amber-600',
    border: 'border-l-amber-500',
  },
  Low: {
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    icon: 'text-slate-500',
    border: 'border-l-slate-400',
  },
};

const ALERT_ICONS: Record<string, React.ElementType> = {
  inactive_lead: Clock,
  dropout_risk: UserX,
  missing_documents: FileX,
  payment_delay: CreditCard,
  low_performance: Users2,
};

export function RiskAlerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Try DB alerts first, then fallback to live scan
        let data = await AdmissionOS.getRiskAlerts();
        if (data.length === 0) {
          data = await AdmissionOS.runRiskScan();
        }
        setAlerts(data);
      } catch (e) {
        console.error('Failed to load risk alerts:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary animate-pulse" />
          <span className="font-semibold text-sm">Scanning for risks...</span>
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm text-center">
        <Shield className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p className="font-semibold">No active risks</p>
        <p className="text-xs text-muted-foreground mt-1">All systems healthy. Pipeline running smoothly.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-sm">Risk Alerts</h3>
        </div>
        <span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-bold px-2 py-0.5 rounded-full">
          {alerts.length} active
        </span>
      </div>

      <div className="divide-y divide-border max-h-[500px] overflow-y-auto custom-scrollbar">
        {alerts.map(alert => {
          const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.Medium;
          const Icon = ALERT_ICONS[alert.alertType] || AlertTriangle;

          return (
            <div
              key={alert.id}
              className={cn("px-5 py-3.5 border-l-4 transition-all hover:bg-muted/20", style.border)}
            >
              <div className="flex items-start gap-3">
                <div className={cn("mt-0.5 p-1.5 rounded-lg", style.bg)}>
                  <Icon className={cn("w-4 h-4", style.icon)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold truncate">{alert.title}</p>
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0",
                      alert.severity === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      alert.severity === 'High' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    )}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{alert.description}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/leads/${alert.entityId}`)}
                      className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1"
                    >
                      <ChevronRight className="w-3 h-3" /> {alert.suggestedAction}
                    </button>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
