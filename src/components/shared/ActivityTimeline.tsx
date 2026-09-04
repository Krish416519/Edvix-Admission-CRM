import { useState, useMemo } from 'react';
import { AuditLog } from '../../types/audit';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { 
  User, FileText, CheckCircle2, Phone, Mail, 
  MessageSquare, Edit2, Plus, LogIn, LogOut, Settings, 
  ArrowRight, Circle, Activity, ChevronDown, ChevronUp, UserCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Helps categorize events to hide/de-emphasize noise
const isSystemNoise = (log: AuditLog) => {
  if (log.title?.toLowerCase().includes('notification read')) return true;
  if (log.title?.toLowerCase().includes('notification delivered')) return true;
  if (log.action === 'system' && !log.title?.toLowerCase().includes('error')) return true;
  return false;
};

// Date grouping helper
const getDateGroupLabel = (dateString: string) => {
  const date = new Date(dateString);
  if (isToday(date)) return 'TODAY';
  if (isYesterday(date)) return 'YESTERDAY';
  return format(date, 'MMM dd, yyyy').toUpperCase();
};

const FormattedDescription = ({ text }: { text: string }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const kvPairs: { key: string, value: string }[] = [];
  let summary = '';
  let inNotesSection = false;
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed === '[Additional Notes]' || trimmed === 'Notes: [Additional Notes]') {
      inNotesSection = true;
      return;
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return; // Skip headers
    }

    if (trimmed.startsWith('Notes: [')) {
      return; // Skip 'Notes: [Section Header]'
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0 && !inNotesSection && !trimmed.startsWith('http')) { 
      const key = trimmed.substring(0, colonIdx).trim();
      let value = trimmed.substring(colonIdx + 1).trim();
      
      if (value.startsWith('**') && value.endsWith('**')) {
        value = value.substring(2, value.length - 2);
      }
      
      if (key === 'Notes') {
        summary += (summary ? '\n' : '') + value;
      } else {
        kvPairs.push({ key, value });
      }
    } else {
      summary += (summary ? '\n' : '') + trimmed;
    }
  });

  if (kvPairs.length === 0 && !summary) {
    return <div className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{text}</div>;
  }

  return (
    <div className="mt-3 space-y-3">
      {summary && summary !== 'na.' && summary !== 'No additional notes provided.' && (
        <div className="text-sm text-foreground whitespace-pre-wrap">
          {summary}
        </div>
      )}
      
      {kvPairs.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-2">
          {kvPairs.map((pair, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 text-sm">
              <span className="text-muted-foreground min-w-[120px] font-medium">{pair.key}:</span>
              <span className="text-foreground break-words">{pair.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export function ActivityTimeline({ logs, onLogClick, showAuthor = true, hideNoise = true }: { logs: AuditLog[], onLogClick?: (log: AuditLog) => void, showAuthor?: boolean, hideNoise?: boolean }) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getIcon = (action: string, entityType: string) => {
    const act = action.toLowerCase();
    if (act.includes('assign')) return <UserCheck className="w-4 h-4 text-blue-500" />;
    if (act.includes('status') || act.includes('disposition')) return <Activity className="w-4 h-4 text-purple-500" />;
    if (act.includes('creat')) return <Plus className="w-4 h-4 text-green-500" />;
    if (act.includes('updat')) return <Edit2 className="w-4 h-4 text-amber-500" />;
    if (entityType === 'Task' && act.includes('complet')) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (entityType === 'Document') return <FileText className="w-4 h-4 text-orange-500" />;
    
    // fallbacks
    if (act.includes('whatsapp')) return <MessageSquare className="w-4 h-4 text-emerald-500" />;
    if (act.includes('email')) return <Mail className="w-4 h-4 text-blue-500" />;
    if (act.includes('call')) return <Phone className="w-4 h-4 text-green-500" />;
    if (act.includes('note')) return <FileText className="w-4 h-4 text-amber-500" />;
    
    return <Circle className="w-4 h-4 text-muted-foreground" />;
  };

  const getActionTitle = (log: AuditLog) => {
    const act = log.action.toLowerCase();
    if (act === 'assignment') return log.previousValue === 'Unassigned' ? 'LEAD ASSIGNED' : 'LEAD REASSIGNED';
    if (act === 'status_change' || act === 'status changed') return 'STAGE CHANGED';
    if (act === 'disposition_change' || act === 'disposition changed') return 'DISPOSITION CHANGED';
    if (act === 'priority_change') return 'PRIORITY CHANGED';
    if (act === 'lead_created' || act === 'created') return 'LEAD CAPTURED';
    if (act === 'call') return 'CALL COMPLETED';
    if (act === 'note') return 'NOTE ADDED';
    if (log.entityType === 'Task') {
       if (act.includes('complet')) return 'TASK COMPLETED';
       if (act.includes('creat')) return 'TASK CREATED';
    }
    
    return log.title?.toUpperCase() || 'ACTION PERFORMED';
  };

  // Grouping logic
  const groupedLogs = useMemo(() => {
    const filtered = hideNoise ? logs.filter(l => !isSystemNoise(l)) : logs;
    const groups: { label: string; logs: AuditLog[] }[] = [];
    
    filtered.forEach(log => {
      const groupLabel = getDateGroupLabel(log.timestamp);
      let lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.label !== groupLabel) {
        lastGroup = { label: groupLabel, logs: [] };
        groups.push(lastGroup);
      }
      lastGroup.logs.push(log);
    });
    
    return groups;
  }, [logs, hideNoise]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {groupedLogs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
          <p>No activity logs found.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedLogs.map((group, groupIdx) => (
            <div key={group.label} className="space-y-4">
              {/* Date Header */}
              <div className="flex items-center gap-4">
                <h4 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">{group.label}</h4>
                <div className="h-px bg-border flex-1" />
              </div>

              {/* Group Timeline */}
              <div className="relative border-l border-border/50 ml-3 space-y-6 pb-2">
                {group.logs.map((log) => {
                  const isSystem = log.userName === 'System' || log.source === 'System';
                  const titleStr = getActionTitle(log);
                  const isCaptured = titleStr === 'LEAD CAPTURED';
                  const isAssignment = titleStr.includes('ASSIGNED');
                  const hasStructuredChange = !!(log.previousValue || log.newValue);
                  
                  // Notes should default to short preview
                  const isNote = titleStr === 'NOTE ADDED';
                  const isExpandable = !!log.description && (isNote || !hasStructuredChange);

                  return (
                    <div key={log.id} className="relative pl-6 sm:pl-8 group/item">
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-background border-2 border-muted flex items-center justify-center -translate-x-1/2 z-10 shadow-sm group-hover/item:border-primary/50 transition-colors">
                        {getIcon(log.action, log.entityType)}
                      </div>

                      <div 
                        onClick={(e) => {
                          if (onLogClick) onLogClick(log);
                          else if (isExpandable) toggleItem(log.id, e);
                        }}
                        className={cn(
                          "flex flex-col gap-2 p-4 rounded-xl border transition-colors",
                          isCaptured ? "bg-primary/5 border-primary/20" : "bg-card border-border shadow-sm",
                          (onLogClick || isExpandable) && "cursor-pointer hover:border-primary/30 hover:shadow-md"
                        )}
                      >
                        {/* Header: Event Type & Time */}
                        <div className="flex justify-between items-start mb-2">
                          <h5 className={cn(
                            "text-xs font-bold tracking-wide",
                            isCaptured ? "text-primary" : "text-muted-foreground"
                          )}>
                            {titleStr}
                          </h5>
                          <span className="text-xs text-muted-foreground font-medium shrink-0 ml-4" title={format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}>
                            {format(new Date(log.timestamp), 'h:mm a')}
                          </span>
                        </div>

                        {/* Body: Specialized Renderers */}
                        
                        {/* 1. Lead Captured */}
                        {isCaptured && (
                          <div className="text-sm">
                            <p className="text-foreground font-medium mb-1">{log.description || 'Lead was added to the CRM'}</p>
                            {log.source && <p className="text-muted-foreground">Source: {log.source}</p>}
                          </div>
                        )}

                        {/* 2. Structured Change (Stage/Status/Disposition/Assignment) */}
                        {!isCaptured && hasStructuredChange && (
                          <div className="flex flex-col gap-2">
                            {(log.previousLabel || log.newLabel) && !isAssignment && (
                              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                {log.newLabel || log.previousLabel}
                              </span>
                            )}
                            <div className="flex items-center gap-3 text-sm">
                              {log.previousValue ? (
                                <span className="text-muted-foreground font-medium line-through decoration-muted-foreground/50">{log.previousValue}</span>
                              ) : (
                                <span className="text-muted-foreground italic">None</span>
                              )}
                              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                              {log.newValue ? (
                                <span className="text-foreground font-bold">{log.newValue}</span>
                              ) : (
                                <span className="text-muted-foreground italic">None</span>
                              )}
                            </div>
                            {log.description && !isAssignment && log.description !== log.title && (
                              <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                                {log.description.replace(/Disposition: \*\*.*?\*\*/, '').trim()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. Note Added */}
                        {!isCaptured && !hasStructuredChange && isNote && log.description && (
                          <div className="text-sm text-foreground/90 bg-muted/30 p-3 rounded-lg border border-border/50">
                            {expandedItems.has(log.id) ? (
                              <div className="whitespace-pre-wrap">{log.description}</div>
                            ) : (
                              <div className="flex items-center justify-between gap-4">
                                <span className="line-clamp-2 italic">"{log.description.split('\n')[0]}"</span>
                                {log.description.length > 100 && (
                                  <span className="text-xs text-primary font-medium shrink-0 whitespace-nowrap flex items-center gap-1">
                                    View more <ChevronDown className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 4. Unstructured Content (Calls/Tasks/Legacy) */}
                        {!isCaptured && !hasStructuredChange && !isNote && log.description && (
                          <div className="text-sm text-foreground">
                            {expandedItems.has(log.id) ? (
                              <FormattedDescription text={log.description} />
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground group-hover/item:text-foreground/80 transition-colors">
                                <span className="line-clamp-2">{log.description.split('\n')[0]}</span>
                                {log.description.length > 80 && <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-50" />}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* 5. Fallback Title if no structured or description */}
                        {!isCaptured && !hasStructuredChange && !log.description && (
                          <div className="text-sm font-medium text-foreground">{log.title}</div>
                        )}

                        {/* Footer: Actor Info */}
                        {showAuthor && (
                          <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">
                              {isAssignment ? 'Assigned by' : isCaptured ? 'Created by' : 'Changed by'}
                            </span>
                            <span className={cn(
                              "font-medium",
                              isSystem ? "text-muted-foreground" : "text-foreground"
                            )}>
                              {isSystem ? 'System' : log.userName}
                            </span>
                            {!isSystem && log.userRole && (
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/30 inline-block" />
                                {log.userRole}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
