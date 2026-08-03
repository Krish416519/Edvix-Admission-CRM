import React from 'react';
import { AuditLog } from '../../types/audit';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  User, FileText, CheckCircle2, Phone, Mail, 
  MessageSquare, Edit2, Plus, LogIn, LogOut, Settings, 
  ArrowRight, ShieldAlert, Circle, Activity
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function ActivityTimeline({ logs, onLogClick }: { logs: AuditLog[], onLogClick?: (log: AuditLog) => void }) {
  
  const getIcon = (action: string, entityType: string) => {
    if (action === 'Login' || action === 'Logout') return <LogIn className="w-4 h-4 text-blue-500" />;
    if (action === 'Created' && entityType === 'Lead') return <Plus className="w-4 h-4 text-green-500" />;
    if (action === 'Status Changed') return <Activity className="w-4 h-4 text-purple-500" />;
    if (action === 'Updated') return <Edit2 className="w-4 h-4 text-amber-500" />;
    if (entityType === 'Task' && action === 'Completed') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (entityType === 'Document') return <FileText className="w-4 h-4 text-orange-500" />;
    if (entityType === 'Settings') return <Settings className="w-4 h-4 text-slate-500" />;
    
    // fallbacks
    if (action.includes('WhatsApp')) return <MessageSquare className="w-4 h-4 text-emerald-500" />;
    if (action.includes('Email')) return <Mail className="w-4 h-4 text-blue-500" />;
    if (action.includes('Call')) return <Phone className="w-4 h-4 text-green-500" />;
    
    return <Circle className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
          <p>No activity logs found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {logs.map((log, index) => (
            <div key={log.id} className="relative pl-8 group">
              {index !== logs.length - 1 && (
                <div className="absolute left-3 top-8 bottom-[-1.5rem] w-px bg-border -translate-x-1/2 group-hover:bg-primary/50 transition-colors" />
              )}
              
              <div className="absolute left-3 top-1 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center -translate-x-1/2 z-10 shadow-sm group-hover:border-primary/50 transition-colors">
                {getIcon(log.action, log.entityType)}
              </div>

              <div 
                onClick={() => onLogClick && onLogClick(log)}
                className={cn(
                  "bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/30 transition-colors",
                  onLogClick && "cursor-pointer hover:shadow-md"
                )}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{log.userName}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">
                        {log.userRole || 'System'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </span>
                    <span className="text-[10px] text-muted-foreground opacity-60">
                      {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
                
                <h4 className="text-sm font-semibold text-foreground mb-1">{log.title}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {log.description}
                </p>

                {(log.previousValue || log.newValue) && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-medium bg-muted/30 p-2 rounded-lg border border-border/50">
                    {log.previousValue && (
                      <span className="text-muted-foreground line-through decoration-muted-foreground/50">{log.previousValue}</span>
                    )}
                    {log.previousValue && log.newValue && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
                    {log.newValue && (
                      <span className="text-foreground">{log.newValue}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
