import { useState, useMemo } from 'react';
import { AuditLog } from '../../types/audit';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { 
  User, FileText, CheckCircle2, Phone, Mail, 
  MessageSquare, Edit2, Plus, LogIn, LogOut, Settings, 
  ArrowRight, Circle, Activity, ChevronDown, ChevronUp, UserCheck, Calendar
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

export const parseDescription = (text: string) => {
  let cleanText = (text || '').trim();
  if (cleanText.startsWith('"') && cleanText.endsWith('"')) {
    cleanText = cleanText.substring(1, cleanText.length - 1);
  }
  
  const kvPairs: { key: string, value: string }[] = [];
  let summary = '';

  // 1. Try JSON Parse first
  try {
    const parsed = JSON.parse(cleanText);
    if (parsed && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string' && (k === 'Counselling Details' || k === 'Counseling Details')) {
           cleanText = v; // process this string below
           break;
        } else if (typeof v === 'string') {
           kvPairs.push({ key: k, value: v });
        } else {
           kvPairs.push({ key: k, value: JSON.stringify(v) });
        }
      }
      if (kvPairs.length > 0 && cleanText === text.trim()) {
         return { kvPairs, summary };
      }
    }
  } catch (e) {
    // Ignore JSON error, fallback to string parsing
  }

  // 2. Parse inline unstructured string
  if (cleanText.includes('[Counseling Details]') || cleanText.includes('[Counselling Details]') || (!cleanText.includes('\n') && (cleanText.match(/:/g) || []).length > 1)) {
    let detailsPart = cleanText;
    let notesPart = '';
    
    const noteMarkers = ['{Additional Notes}', '[Additional Notes]', 'Notes:', 'Additional Notes:'];
    let notesIdx = -1;
    let foundMarker = '';

    for (const marker of noteMarkers) {
      const idx = cleanText.lastIndexOf(marker);
      if (idx > 0 && idx > cleanText.length / 2) {
        notesIdx = idx;
        foundMarker = marker;
        break;
      }
    }

    if (notesIdx !== -1) {
      detailsPart = cleanText.substring(0, notesIdx);
      let noteValue = cleanText.substring(notesIdx + foundMarker.length).trim();
      noteValue = noteValue.replace(/^["'\s]+|["'\s]+$/g, '');
      if (noteValue.endsWith('"}') || noteValue.endsWith('}')) {
         noteValue = noteValue.replace(/["}]*$/, '');
      }
      summary = noteValue;
    }
    
    detailsPart = detailsPart.replace(/\[.*?\]/g, '').replace(/\{.*?\}/g, '').trim(); 
    
    const kvRegex = /(?:^|\s)([A-Za-z][A-Za-z0-9 -]*?):(?=\s|$)/g;
    let match;
    let keys = [];
    while ((match = kvRegex.exec(detailsPart)) !== null) {
      const fullMatch = match[0];
      const keyName = match[1];
      const colonIndex = fullMatch.lastIndexOf(':');
      const endOfKeyString = match.index + colonIndex + 1;
      keys.push({ key: keyName.trim(), index: match.index, end: endOfKeyString });
    }
    
    if (keys.length > 0) {
      for (let i = 0; i < keys.length; i++) {
        const currentKey = keys[i];
        const nextKey = keys[i + 1];
        let value = detailsPart.substring(
          currentKey.end, 
          nextKey ? nextKey.index : detailsPart.length
        ).trim();
        
        if (value.startsWith('**') && value.endsWith('**')) {
          value = value.substring(2, value.length - 2);
        }
        
        kvPairs.push({ key: currentKey.key, value });
      }
      return { kvPairs, summary };
    }
  }

  // 3. Fallback to basic newline parsing
  const lines = cleanText.split('\n');
  let inNotesSection = false;
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed === '[Additional Notes]' || trimmed === 'Notes: [Additional Notes]') {
      inNotesSection = true;
      return;
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return; 
    }

    if (trimmed.startsWith('Notes: [')) {
      return; 
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
  
  return { kvPairs, summary };
};

const FormattedDescription = ({ text }: { text: string }) => {
  if (!text) return null;

  const { kvPairs, summary } = parseDescription(text);

  if (kvPairs.length === 0 && !summary) {
    return <div className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{text}</div>;
  }

  return (
    <div className="mt-3">
      {summary && summary !== 'na.' && summary !== 'No additional notes provided.' && (
        <div className="mb-4">
          <h4 className="text-[13px] font-semibold text-muted-foreground mb-1">Overall Summary</h4>
          <div className="text-sm text-foreground/90 whitespace-pre-wrap">
            {summary}
          </div>
        </div>
      )}
      
      {kvPairs.length > 0 && (
        <div className="flex flex-wrap gap-2.5">
          {kvPairs.map((pair, idx) => (
            <div key={idx} className="flex flex-col justify-center px-3 py-2 border border-border/60 rounded-md bg-transparent min-w-[120px] hover:bg-muted/10 transition-colors">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{pair.key}</span>
              <span className="text-sm font-medium text-foreground/90 break-words">{pair.value}</span>
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
                  
                  const isDisposition = titleStr === 'DISPOSITION CHANGED' || !!(log.description && (log.description.includes('[Counseling Details]') || log.description.includes('Counselling Details') || log.description.includes('Counseling Details')));

                  if (isDisposition) {
                    const { kvPairs, summary } = parseDescription(log.description || '');
                    return (
                      <div key={log.id} className="relative pl-6 sm:pl-8 group/item">
                        {/* Timeline dot */}
                        <div className="absolute left-0 top-6 w-6 h-6 rounded-full bg-background border-2 border-muted flex items-center justify-center -translate-x-1/2 z-10 shadow-sm group-hover/item:border-primary/50 transition-colors">
                          <Circle className="w-2.5 h-2.5 fill-muted text-muted" />
                        </div>
                        <div className="flex flex-col rounded-xl border border-border bg-card p-5 w-full transition-colors hover:border-primary/30 hover:shadow-md">
                          {/* Header Row */}
                          <div className="flex justify-between items-start w-full">
                            <div className="flex gap-4">
                              {/* Icon */}
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <FileText className="w-5 h-5 text-primary" />
                              </div>
                              
                              {/* Name and Pill */}
                              <div className="flex flex-col">
                                <span className="text-[11px] text-muted-foreground font-medium leading-none mb-1.5">{log.userRole || 'System'}</span>
                                <h4 className="text-[15px] font-semibold text-foreground leading-none">{log.userName || 'System'}</h4>
                                <div className="mt-2.5">
                                  <span className="px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-[10px] font-semibold tracking-wide">
                                     {log.newValue || log.title.replace('Disposition: ', '') || 'Counselled'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Date Pill */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {format(new Date(log.timestamp), "MMM dd, yyyy 'at' h:mm a")}
                              </span>
                            </div>
                          </div>

                          {/* Divider line */}
                          <div className="h-px w-full bg-border my-5" />

                          {/* Body (Overall Summary + Grid) */}
                          <div className="flex flex-col">
                            {kvPairs.length > 0 && (
                              <div className="flex flex-col">
                                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                                  {kvPairs.map((pair, idx) => {
                                    const valLower = pair.value.toLowerCase();
                                    const isBool = valLower === 'yes' || valLower === 'no';
                                    const isYes = valLower === 'yes';
                                    return (
                                      <div key={idx} className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-tight">{pair.key}</span>
                                        <span className={`text-[12px] font-semibold leading-snug ${isBool ? (isYes ? 'text-emerald-500' : 'text-rose-500') : 'text-foreground'}`}>
                                          {pair.value}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {summary && summary !== 'na.' && summary !== 'No additional notes provided.' && (
                              <div className={`${kvPairs.length > 0 ? 'mt-3' : ''} bg-muted/30 p-3 rounded-lg border border-border/50`}>
                                 <h5 className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Additional Notes</h5>
                                 <p className="text-[12px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{summary}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

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
